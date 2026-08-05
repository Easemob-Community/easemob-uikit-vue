# Vue3 UIKit 组件编写规范（新增/修改组件的硬约束）

## 触发词

- `写组件` / `加个组件`
- `组件规范`
- `emits 命名`
- `Em 前缀`
- `导出/resolver`

## 目标

在 `easemob-uikit-vue`（核心包 `packages/uikit/src`）里新增或改写 SFC 组件时，
**保证与既有 60+ 组件的写法、命名、导出契约完全一致**，尤其是对外 API（组件名 + 事件名）
这条「一旦发出去就不能改」的红线。

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-component-authoring**。

UI 分三层，先认清自己在写哪一层：
`components/*`（原子展示，如 button/avatar/modal）→ `modules/*`（业务块 chat/contact/conversation/group，持交互逻辑）→ `containers/*`（页面容器，薄壳）。

## 1. SFC 骨架固定

一律 `<script setup lang="ts">`；块序固定 **script → template → style**；`<style scoped>` 必带（哪怕只有块名根类）。
`<script setup>` 内顺序：imports → props/emits → 状态与逻辑。见 `components/button/button.vue`、
`modules/conversation/conversation-item.vue`，全仓无例外。

## 2. 从不写 `defineOptions({ name })`

组件对外身份**只来自 barrel 的 `Em*` 导出别名**（见第 5、6 节），不是 SFC 内部声明。
全仓 0 处 `defineOptions` 定名。多写一处 = 双源、会漂移。

## 3. props：type-based + 命名 interface + withDefaults

用 `defineProps<XxxProps>()`；有默认值时套 `withDefaults`；**数组/对象默认值必须用工厂函数**。
见 `components/button/button.vue`：

```ts
export interface ButtonProps {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false,
})
```

数组默认值用工厂函数（`modules/conversation/conversation-item.vue`）：

```ts
const props = withDefaults(defineProps<ConversationItemProps>(), {
  customActions: () => [], // 不能写 customActions: []
  showSenderName: true,
  unreadMode: 'count',
})
```

### 3.1 Boolean prop 默认值陷阱（必须给显式默认值）

**Vue 3 对 `Boolean` 类型 prop 有特殊处理**：当父组件不传且 `withDefaults` 中未提供默认值时，Vue 会将 `undefined` 自动转为 `false`（而非保持 `undefined`）。

这会导致依赖 `??` 运算符的回落链路失效：

```ts
// ❌ 错误示例：以为不传就是 undefined，实际是 false
showNotice?: boolean  // 不传 → props.showNotice = false（Vue Boolean 自动转换）
const effective = computed(() => props.showNotice ?? true)  // false ?? true = false ！

// ✅ 正确：在 withDefaults 中给默认值
const props = withDefaults(defineProps<MyProps>(), {
  showNotice: true,  // 不传 → props.showNotice = true
})
```

**规则**：所有 `Boolean` 类型 prop **必须在 `withDefaults` 中提供显式默认值**，即使默认值是 `false` 也要写出来——靠显式声明而非依赖 Vue 隐式行为。

> `number`、`string` 等非 Boolean 类型不受此影响，不传时保持 `undefined`。

---

## 4. emits：type-based，公开事件名一律 kebab-case（lint 强制）

用 `defineEmits<...>()`。**对外事件名一律 kebab-case**：多词写连字符
（`send-success` / `max-exceed` / `conversation-select` / `custom-action`），单词事件用小写
（`select` / `pin` / `close` / `read`）。见 `modules/conversation/conversation-item.vue`：

```ts
const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'pin', id: string, isPinned: boolean): void
  (e: 'delete', id: string): void
  (e: 'read', id: string): void
  (e: 'custom-action', key: string, conversation: Conversation): void
}>()
```

这条由 `eslint.config.js` **强制**，camelCase 事件直接报错：

```js
// eslint.config.js
'vue/custom-event-name-casing': ['error', 'kebab-case'],
```

## 5. `Em*` 名字只在各层 `index.ts` 的 export 别名里给

组件文件本身不带 `Em` 前缀（`button.vue`、`conversation-item.vue`），**公开名靠 barrel 起别名**。

- `components/index.ts`、`containers/index.ts`：扁平显式再导出（containers 还额外再导出 props 类型）：

  ```ts
  // components/index.ts
  export { default as EmButton } from './button/button.vue'
  export { default as EmAvatar } from './avatar/avatar.vue'
  ```

  ```ts
  // containers/index.ts
  export { default as EmChatContainer } from './chat-container/chat-container.vue'
  export type { ContactListContainerProps } from './contact-list-container/contact-list-container.vue'
  ```

- `modules/index.ts`：两级 barrel，顶层 `export * from './conversation'`，各 module 自己 `index.ts` 起别名：

  ```ts
  // modules/conversation/index.ts
  export { default as EmConversationList } from './conversation-list.vue'
  export { default as EmConversationItem } from './conversation-item.vue'
  ```

新增组件 = 建 `xxx.vue` + 在**对应层的 `index.ts`** 加一条 `export { default as EmXxx }`。

## 6. resolver / 插件契约：barrel 别名名就是公开 API

`src/resolver.ts` 的 `EasemobUIKitResolver`（默认 prefix `Em`）把模板里 `<EmXxx/>`
直接解析到 `@easemob/uikit` 的**同名命名导出**——所以别名名 = 用户可写的标签名 = 公开 API，
这正是不需要 `defineOptions` 的根因：

```ts
// src/resolver.ts
const prefix = options.prefix ?? 'Em'
if (!name.startsWith(prefix)) return
return { name, from: '@easemob/uikit' } // <EmChatContainer/> → import { EmChatContainer }
```

全量注册（`app.use(UIKit)`）走 `src/index.ts` 的 `install`：**只注册以 `Em` 开头且是组件的具名导出**，支持自定义 prefix：

```ts
// src/index.ts
if (!name.startsWith('Em')) continue
if (!isVueComponent(value)) continue
const finalName = prefix === 'Em' ? name : `${prefix}${name.slice(2)}`
app.component(finalName, value as Component)
```

→ 不以 `Em` 开头 = 不会被解析、也不会被注册。命名一旦错，用户根本用不到。

## 7. 样式：BEM + CSS 变量（细节见另一 skill）

类名走 BEM（`.conversation-item__name.is-at-me`），主题只用 `var(--uikit-*)` 变量、不写死颜色/时长。
样式与主题的完整规范属 skill **`uikit-styling-theming`**，此处不展开，写样式前请转过去。

## 8. 枚举字符串常量：业务代码一律引用 `src/constants/index.ts`

会话类型 / 消息类型 / 消息状态 / 群成员角色 / 转发模式等枚举字符串，**禁止在业务代码（composables / sdk / modules / containers / story）中硬编码字面量**，统一引用 `src/constants/index.ts` 导出：

```ts
// src/constants/index.ts（定义处保留字面量）
export const CONVERSATION_TYPE = { SINGLECHAT: 'singleChat', GROUPCHAT: 'groupChat' } as const
export const MESSAGE_TYPE = { TEXT: 'text', IMAGE: 'image', VOICE: 'voice', VIDEO: 'video', FILE: 'file', CMD: 'cmd', CUSTOM: 'custom', LOCATION: 'location', COMBINE: 'combine', NOTICE: 'notice' } as const
export const MESSAGE_STATUS = { SENDING: 'sending', SENT: 'sent', DELIVERED: 'delivered', READ: 'read', FAILED: 'failed' } as const
export const GROUP_MEMBER_ROLE = { OWNER: 'owner', ADMIN: 'admin', MEMBER: 'member' } as const
export const FORWARD_MODE = { ONE_BY_ONE: 'oneByOne', COMBINE: 'combine' } as const
export const ACK_TYPE = { READ: 'read', DELIVERED: 'delivered' } as const
export const HEADER_ALIGN = { LEFT: 'left', CENTER: 'center', RIGHT: 'right' } as const
export type ConversationTypeValue = (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE]
// ... 其余类型别名同理
```

用法规则：

- **运行时比较 / 传参**：`cvs.type === CONVERSATION_TYPE.GROUPCHAT`、`sendText(chatType, ...)`，不用裸 `'groupChat'`；switch case 同样写 `case MESSAGE_TYPE.TEXT:`。
- **类型联合声明**：`type?: 'singleChat' | 'groupChat'` 一律替换为导出的类型别名 `ConversationTypeValue`（`GroupMemberRoleValue` / `MessageStatusValue` / `ForwardModeValue` 同理），避免类型与常量双源漂移。
- `<script setup>` 中 import 的常量可直接在模板使用（如 `FORWARD_MODE.ONE_BY_ONE`、`GROUP_MEMBER_ROLE.MEMBER`），无需额外暴露。
- **定义处保留字面量**：`src/constants/index.ts` 自身、`src/sdk/types.ts` 的 SDK 契约类型定义不套常量。
- **SDK 协议内部字段保留**：SDK body 的 `type: 'img' / 'audio' / 'txt'` 等 wire 协议字段、SDK 降级值 `'unknown'` 不属于 MESSAGE_TYPE 语义，不套用。
- **非枚举业务 key 保留**：视图页签、操作 key 等仅作本地标识的字符串（如 user-card-modal 的操作 key）不强制提取。

---

## 硬规则 vs 软约定

**硬规则（lint / 构建 / resolver 会拦或直接影响可用性，100% 遵守）：**

- `<script setup lang="ts">` + 块序 + `<style scoped>`（第 1 节）。
- 公开事件 kebab-case —— `vue/custom-event-name-casing` **报错级**（第 4 节）。
- `Em*` 别名只在 `index.ts` 给；不写 `defineOptions`；名字不以 `Em` 开头就进不了 resolver/install（第 2、5、6 节）。
- props 用 type-based `defineProps<XxxProps>()` + `withDefaults`，数组/对象默认值用工厂函数（第 3 节）。
- **Boolean prop 必须在 `withDefaults` 中显式给默认值**——Vue 3 对未设默认值的 Boolean prop 自动转为 `false`，导致 `??` 回落链断裂（详见第 3.1 节）。
- **枚举字符串（会话类型/消息类型/消息状态/群角色/转发模式等）一律引用 `src/constants/index.ts` 常量，禁止业务代码硬编码字面量**；类型联合用导出的类型别名（第 8 节）。

**软约定（真实主流但有存量例外，靠 review 把关；新代码按严格版写）：**

- **命名 `XxxProps` / `XxxEmits` interface**：components/containers **100%**；modules 约 **12/42**
  文件仍用内联 `defineProps<{ ... }>` 字面量（集中在 `modules/contact/*`、`modules/group/*`）。
  → 新代码**一律命名 interface**；存量收敛见根 `TECH-DEBT.md` **D10**。
- **`.uikit-` 类名前缀只在原子层**（`.uikit-button` / `.uikit-avatar`），modules/containers 用裸块名
  （`.conversation-item`）。这是 tier 习惯，非强制。
- **三层职责**：components 纯展示原子；modules 持交互逻辑；containers 薄——包一个 module，
  把通用事件翻成域事件（如 `@select` → `emit('conversation-select', …)`），并从 composable 取状态。
- **H5 适配**：需要安全区/键盘/移动态的组件，优先从 `useUIKit().h5` 读取，不要新增独立 props；
  安全区通过 `var(--uikit-safe-*, 0px)` 变量处理，禁止组件内直接写 `env(safe-area-inset-*)`。
- **编辑态自动聚焦**：所有内联编辑入口（群名称、备注、公告、描述等）在切换编辑态后，
  **必须**通过 `watch(isEditing, async () => { await nextTick(); inputRef.value?.focus() })` 实现输入框自动聚焦。
  模板 ref 命名统一为 `{field}InputRef`（如 `groupNameInputRef`、`remarkInputRef`）。
- **结构歧义**：`modules/chat/message-input.vue` 与 `modules/chat/message-input/` 目录并存，命名易混，
  新增别踩这坑，见 `TECH-DEBT.md` **D11**。
- **打包契约提醒**：`packages/uikit/vite.config.ts` 的 external 里 `im-sdk-web` 是**过时名**
  （真实包名 `easemob-websdk`），SDK 现被打进 dist，见 `TECH-DEBT.md` **D2**；改 external 时留意。

## 反面清单

- ❌ 用 `defineOptions({ name })` 定组件名 —— 与 barrel 别名双源，必漂移。
- ❌ 公开事件用 camelCase（如 `sendSuccess`）—— 破坏调用方且过不了 `vue/custom-event-name-casing`。
- ❌ 新增 module 组件用内联 `defineProps<{ ... }>` 字面量 —— 新代码要命名 `XxxProps` interface。
- ❌ 数组/对象 props 默认值写成 `[]` / `{}` 字面量 —— 必须工厂函数 `() => []`。
- ❌ 建了 `xxx.vue` 却忘在对应层 `index.ts` 起 `EmXxx` 别名 —— resolver/install 都拿不到，等于没导出。
- ❌ 组件名不以 `Em` 开头 —— 不会被解析也不会被全局注册。
- ❌ 调用方/内部从深层文件直接 `import` 组件 `.vue`，绕开 `Em*` 命名导出 / resolver。
- ❌ 漏 `<style scoped>`，或样式里写死颜色/时长而非 `var(--uikit-*)`（详见 `uikit-styling-theming`）。
- ❌ 业务代码里写死 `'groupChat'` / `'owner'` / `'text'` 等枚举字符串，或类型联合手写 `'singleChat' | 'groupChat'` —— 一律引用 `src/constants/index.ts`（第 8 节），改常量值一处生效。
- ❌ 组件里直接 `env(safe-area-inset-*)` 或自行监听 `resize/visualViewport` 处理 H5 适配。
- ❌ Boolean prop 不在 `withDefaults` 中给默认值，依赖 Vue 隐式 `false` 或 `?? true` 回落——Vue 3 会先把 `undefined` 转成 `false`，`false ?? true` = `false`，导致 "默认 true" 的逻辑永远不生效。
