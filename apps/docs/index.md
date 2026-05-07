# Easemob UIKit for Vue

环信 Vue3 UIKit 组件库，提供可复用的 IM UI 组件与业务模块。

## 特性

- Vue 3.3+ Composition API
- Pinia 状态管理
- UnoCSS 原子样式
- H5 适配
- 主题定制
- TypeScript 支持

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
