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

---

## 硬规则 vs 软约定

**硬规则（lint / 构建 / resolver 会拦或直接影响可用性，100% 遵守）：**

- `<script setup lang="ts">` + 块序 + `<style scoped>`（第 1 节）。
- 公开事件 kebab-case —— `vue/custom-event-name-casing` **报错级**（第 4 节）。
- `Em*` 别名只在 `index.ts` 给；不写 `defineOptions`；名字不以 `Em` 开头就进不了 resolver/install（第 2、5、6 节）。
- props 用 type-based `defineProps<XxxProps>()` + `withDefaults`，数组/对象默认值用工厂函数（第 3 节）。

**软约定（真实主流但有存量例外，靠 review 把关；新代码按严格版写）：**

- **命名 `XxxProps` / `XxxEmits` interface**：components/containers **100%**；modules 约 **12/42**
  文件仍用内联 `defineProps<{ ... }>` 字面量（集中在 `modules/contact/*`、`modules/group/*`）。
  → 新代码**一律命名 interface**；存量收敛见根 `TECH-DEBT.md` **D10**。
- **`.uikit-` 类名前缀只在原子层**（`.uikit-button` / `.uikit-avatar`），modules/containers 用裸块名
  （`.conversation-item`）。这是 tier 习惯，非强制。
- **三层职责**：components 纯展示原子；modules 持交互逻辑；containers 薄——包一个 module，
  把通用事件翻成域事件（如 `@select` → `emit('conversation-select', …)`），并从 composable 取状态。
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
