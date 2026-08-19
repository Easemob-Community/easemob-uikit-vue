---
layout: home

hero:
  name: Easemob UIKit
  text: Vue 3 即时通讯 UI 组件库
  tagline: 基于环信 Web IM SDK 构建的高质量 Vue 3 组件库，提供原子组件、业务模块与容器组件，支持主题定制、暗色模式与 H5 移动端适配，开箱即用。
  image:
    light: /logo-light.png
    dark: /logo-dark.png
    alt: Easemob UIKit
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quickstart
    - theme: alt
      text: 组件预览
      link: /components/button

features:
  - icon: 🧩
    title: 组件丰富
    details: 基础、反馈、数据展示、业务容器等 30+ 组件页，覆盖 IM 场景常见 UI 需求。
  - icon: 🎨
    title: 主题定制
    details: 基于 CSS 变量与 ThemeStore 的双层定制能力，一键切换品牌色与组件形态。
  - icon: 📱
    title: H5 适配
    details: 所有组件均兼容移动端，支持安全区、手势与触控优化，一套代码多端运行。
  - icon: 🛠️
    title: TypeScript
    details: 全量 TypeScript 开发，props 与事件类型完整推导，开发体验友好。
  - icon: 💬
    title: 业务模块
    details: 会话、聊天、通讯录、群组四大业务容器，接入即用，二次开发灵活。
  - icon: 🌙
    title: 暗色模式
    details: 一键切换暗色主题，所有组件与文档站同步适配。
---

## 快速开始

安装依赖：

```bash
pnpm add @easemob/uikit-im pinia vue
```

全局注册并挂载：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit-im'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(UIKit)
app.mount('#app')
```

在模板中使用：

```vue
<template>
  <em-button type="primary">发送消息</em-button>
</template>
```

更多用法请查看 [快速开始指南](./guide/quickstart) 与 [组件文档](./components/button)。
