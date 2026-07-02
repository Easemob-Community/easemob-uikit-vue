# easemob-uikit-vue

环信 Vue3 UIKit 组件库，基于 `easemob-websdk`（SDK5）构建，提供可复用的 IM UI 组件与业务模块。

## 特性

- Vue 3.3+ Composition API
- Pinia 状态管理
- TypeScript 严格模式
- H5 适配（安全区、软键盘、下拉刷新、长按交互）
- 主题定制

## 快速开始

```bash
pnpm install @easemob/uikit
```

```ts
import { createApp } from 'vue'
import UIKit from '@easemob/uikit'
import App from './App.vue'

const app = createApp(App)
app.use(UIKit)
app.mount('#app')
```

## H5 适配

在 `<UIKitProvider>` 上配置 `h5` 属性即可一键开启移动端适配：

```vue
<UIKitProvider
  :h5="{
    safeArea: true,
    keyboardAdapt: true,
    pullRefresh: 'auto',
  }"
>
  <EmChatContainer />
</UIKitProvider>
```

详见 [H5 适配指南](./apps/docs/guide/h5-adaptation.md)。

## 文档

```bash
pnpm -F @easemob/docs dev
```

## 开发验证

```bash
# 类型检查
pnpm -F @easemob/uikit exec vue-tsc --noEmit

# 构建
pnpm -F @easemob/uikit build

# demo 类型检查
cd apps/demo && pnpm exec vue-tsc --noEmit
```
