# Vue3 UIKit 的 Pinia store + composable 架构规范（含 @vueuse/core 用法约束）

> 命中本 skill 时，先说一句：`本次命中 skill: uikit-store-composable`。

## 触发词

- `加 store` / `写 store` / `状态管理`
- `写 composable` / `加 hook` / `拆 hook`
- `用 vueuse` / `useXxx 放哪` / `要不要封装 vueuse`
- `store 和 domain 怎么连` / `useUIKit 拿不到 store`

## 目标

在 `packages/uikit/src` 里新增/修改 **Pinia store** 或 **composable** 时，保证与既有 7 个
setup-store、`sdk/domain/*` 契约、`useUIKit()` 装配枢纽保持一致，并落地一套明确的
`@vueuse/core` 使用规定。

> 边界：本 skill 只讲 **store/composable 编写规范** 与 **store↔domain 契约的 store 侧**。
> `sdk/domain / adapter / event` 域内部结构去看 skill `websdk2-uikit-migration`，不在此重复。

## 1. setup-store 骨架（7 个 store，全部从 `store/index.ts` barrel 导出）

现有 store：`client / conversation / message / contact / group / presence / theme`，
统一从 `store/index.ts` 一处 `export *`。统一形态是 **setup 函数式 store**：
`ref 状态 → computed getter → 函数声明 action → 单个扁平 return`。真实片段
（`store/group.ts`）：

```ts
export const useGroupStore = defineStore('group', () => {
  const groupList = ref<UiGroup[]>([])                                  // 1. 状态 ref
  const loaded = ref(false)
  const joinedGroupCount = computed(() =>                               // 2. computed getter
    loaded.value ? groupList.value.length : explicitJoinedGroupCount.value)
  function setGroupList(list: UiGroup[]) { groupList.value = list; loaded.value = true } // 3. action
  function clearGroups() { /* 全量复位所有 ref */ }
  return { groupList, loaded, joinedGroupCount, setGroupList, clearGroups /* …扁平 */ } // 4. 扁平 return
})
```

**每个数据 store 必带全量 reset action**，登出时在一处集中调用
（`composables/use-uikit.ts` 的 `logout()`）：

```ts
stores.client.clearClient()
stores.conversation.clearConversationList()
stores.message.clearMessages()
stores.contact.clearContacts()
stores.group.clearGroups()
stores.presence.clear()
```

reset 命名当前不统一（`clearClient / clearConversationList / clearMessages /
clearContacts / clearGroups / clear` 混用）。**新代码统一 `clearXxx()`**；历史不一致属
已知债，见 `TECH-DEBT.md`（并入 D5 说明，无独立条目），不要为对齐去改公开 store 方法名。

## 2. `loaded + explicitCount` 派生计数——是 scoped 惯用法，不是全局铁律

**仅 contact / group** 用这套：未加载完整列表时用轻量 `explicit*Count`，加载后 count
派生自 `list.length`；`setList` 翻 `loaded=true`，另配 `set*Count` setter。真实片段
（`store/contact.ts`）：

```ts
const explicitContactCount = ref(0)
const contactCount = computed(() =>
  loaded.value ? contactList.value.length : explicitContactCount.value)
function setContactList(list: UiContact[]) { contactList.value = list; loaded.value = true }
function setContactCount(count: number) { explicitContactCount.value = count }
```

conversation / message **没有等价物**——`store/conversation.ts` 只有 `conversationsLoaded`
且 `hasMoreConversations = computed(() => false)` 恒假（占位）。详见 `TECH-DEBT.md` **D5**。
→ 新增 list store **建议对齐此模式**，但要清楚现状只有两处；不要当成所有 store 的铁律去硬套。

## 3. store↔domain 契约：Domain 只依赖极简 `*StoreLike` + 构造注入

`sdk/domain/*-domain.ts` 各自声明**最小** `*StoreLike` 接口，Domain 通过**构造注入**拿 store，
**从不** `useXxxStore()`。真实片段（`sdk/domain/contact-domain.ts`）：

```ts
export interface ContactStoreLike {           // 只列 Domain 真正要用的 5 个方法
  setList: (list: UiContact[]) => void
  addContact: (contact: UiContact) => void
  removeContact: (userId: string) => void
  updateRemark: (userId: string, remark: string) => void
  setBlocklist: (list: UiContact[]) => void
}
export class ContactDomain {
  constructor(private client: ManagerHost, private store: ContactStoreLike) {}
  syncLocal(): UiContact[] { const list = toUiContacts(...); this.store.setList(list); return list }
}
```

store 侧为兼容 `*StoreLike` 会起**别名方法**（`store/contact.ts` 末尾，注释
`别名方法：兼容 Domain 层 ContactStoreLike 接口`）：

```ts
const setList = setContactList
const updateRemark = updateContactRemark
const setBlocklist = setBlackList
```

**两条契约面刻意分层，别混**：
- Domain 拿**极简** `*StoreLike`（构造注入，只列需要的方法）。
- 事件层 `registerEventHandlers(client, stores)` 拿 `sdk/event/types.ts` 的 **`RootStores`**——
  那是**完整** store 类型集合（`ReturnType<typeof useXxxStore>` × 6）。

## 4. 中心装配 + context 枢纽

所有 store / domain 在 `composables/use-uikit.ts` 的 `useUIKitProvider()` 里 **一处实例化**，
打包进 `UIKitContext` 后 `provide()`；`useUIKit()` 是 `inject()` 访问器，provider 外调用会 throw：

```ts
const stores: RootStores = {
  message: useMessageStore(), conversation: useConversationStore(),
  contact: useContactStore(), group: useGroupStore(),
  presence: usePresenceStore(), client: useClientStore(),
}
const domains = { contact: new ContactDomain(host, stores.contact), /* … */ }
provide(UIKIT_CONTEXT_KEY, { client, domains, stores, features, dataSource, theme, … })

export function useUIKit() {
  const ctx = inject(UIKIT_CONTEXT_KEY)
  if (!ctx) throw new Error('useUIKit() must be used within <UIKitProvider>')
  return ctx
}
```

`theme` store 单独 `provide`（与消费方共享同一实例），是「不经 `stores` 直接 `useThemeStore()`」的
唯一合法例外。

## 5. composable 编写规范（`use*` 命名，named function 导出）

两类 composable：

- **(A) feature 型**（`use-contact.ts` / `use-group.ts` / `use-conversation.ts`…）：
  `const { domains, stores, dataSource } = useUIKit()` → 状态用 `computed` 包裹暴露 →
  写操作**委托** `domains.*`（网络/业务）或 `store.*`（本地），常带 `dataSource.fetchXxx`
  override 分支 → 扁平 return。
- **(B) 独立 UI/util 型**：`useToast`（模块级单例）、`useKeyboard / useViewport / useRipple`
  （封装事件监听）、纯函数型 `useContactFilter(refs): ComputedRef`。

**关键规则：feature composable 暴露状态必须 `computed(() => store.xxx)` 包裹，不返回裸 store ref**
（保证响应式且对外只读）。真实片段（`use-contact.ts`）：

```ts
const { domains, stores, dataSource } = useUIKit()
const contactStore = stores.contact
const contactCount = computed(() => contactStore.contactCount)   // computed 包裹，非裸 ref
async function addContact(userId: string, message?: string) {
  await domains.contact.addContact(userId, message)              // 写操作委托 domain
}
```

聚合器 `useChat` / `useMessage` 是**薄聚合层**，只 re-compose `useMessageSend / History /
Actions`（`use-message.ts` 里 `const history = useMessageHistory()` 再转发字段），不自持状态。

## 6. @vueuse/core 用法约束（本 skill 给规定，非只描述现状）

现状混杂：底层原语被包成本地 `use*`——`useViewport` / `useKeyboard` / `useRipple` 内用
`useEventListener`，`useUIKitStorage` 用 `useStorage` 且加 `appKey+userId` 命名空间 key；
但 `onClickOutside / useInfiniteScroll / useClipboard / useScroll / onLongPress` 又在组件里直用。

**规定：**
- **底层原语**（事件监听 `useEventListener`、`useStorage`）→ **封装进 `src/composables/use*`**，
  统一命名空间与清理（如 `useUIKitStorage` 的 `easemob_uikit_{hash}_{suffix}` key）。
- **高阶 API**（`onClickOutside` / `useInfiniteScroll` / `useClipboard` / `useScroll` 等）→
  **可组件内直用**，无需为其再包一层。
- **禁止重造 vueuse 已有能力**。`use-long-press.ts` 已统一封装并在内部使用 vueuse `onLongPress`，
  同时增加了 touchmove 阈值与长按时滚动抑制；组件内统一调用 `useLongPress`，不要再自写或混用 vueuse `onLongPress`。
- H5/移动端状态（viewport / 键盘 / 安全区 / 下拉刷新）统一走 `useUIKit().h5`，
  由 `useH5Adaptation()` 集中管理；禁止组件自行监听 `resize/visualViewport/keyboard`。

## 硬规则 vs 软约定

**硬规则（必须遵守）：**
- setup-store 形态 + 单个扁平 return；数据 store 必带全量 `clearXxx()` reset。
- Domain 只依赖 `*StoreLike` + 构造注入，域内**绝不** `useXxxStore()`。
- feature composable 只经 `useUIKit().stores` 取 store（**theme 例外**）；暴露状态用 `computed` 包裹。
- H5/移动端相关状态只经 `useUIKit().h5` 获取，禁止组件自行监听窗口/键盘/触摸事件。
- 不重造 vueuse 已有能力；底层原语封装、高阶 API 直用。

**软约定（建议对齐，历史不一致可暂留并记债）：**
- reset 命名统一 `clearXxx()`（历史混用见 D5）。
- 新 list store 若需对外总数，对齐 `loaded + explicitCount` 模式（现仅 contact/group 落地）。
- 新「对外主 hook」记得同步登记 `auto-imports.ts`（现无守卫，见 D7）。

## 已知漂移（改到相关文件时顺手对齐，别扩大）

- `use-blocklist.ts` 直接 `useContactStore()` 绕过 `useUIKit()`，与 contact composable 状态源重复 → **D6**。
- `auto-imports.ts` 手工白名单（13 个）与 `composables/index.ts`（28 导出）无同步、已漂移
  （`usePresence` / `useBlocklist` 等未登记）→ **D7**。

## 反面清单

- ❌ 在 `sdk/domain/*` 里 `useXxxStore()`（应构造注入 `*StoreLike`）。
- ❌ feature composable 直接 `return` 裸 store ref（丢响应式/只读约束，必须 `computed` 包裹）。
- ❌ 绕过 `useUIKit()` 直接 `useXxxStore()` 取状态（**theme 除外**）。
- ❌ 自己实现 vueuse 已有的能力（如再写一版长按 / 事件监听 / storage）。
- ❌ 在组件里自行监听 `resize` / `visualViewport` / `keyboard` 算 H5 状态——统一走 `useUIKit().h5`。
- ❌ 把 `loaded + explicitCount` 当成所有 store 的铁律去硬套（只有 contact/group 需要）。
- ❌ 数据 store 漏掉全量 `clearXxx()` reset，导致登出后状态残留。
- ❌ store return 拆成多个对象或裸导出 ref，破坏「单个扁平 return」形态。
