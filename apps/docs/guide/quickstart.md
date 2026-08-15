# 快速开始

本节介绍如何在项目中安装并接入 `@easemob/uikit`。

## 环境要求

- Vue `^3.3.0`
- Pinia `^2.1.0`
- Node.js `^18.0.0`

## 安装

```bash
pnpm add @easemob/uikit pinia vue
```

> 组件库将 `pinia` 与 `vue` 声明为 peerDependencies，需要在使用方项目中显式安装。
> **主题样式需要单独引入**：构建产物将 CSS 提取为独立文件（子路径 `@easemob/uikit/theme`），入口 JS 不会自动注入样式，请在入口处加一行 `import '@easemob/uikit/theme'`（见下方示例）。

## 全局注册

在入口文件中注册 Pinia 与 UIKit 插件：

```ts
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit'
import '@easemob/uikit/theme' // 引入主题样式（构建产物 CSS 提取为独立文件，需手动引入）
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(UIKit)
app.mount('#app')
```

注册后，所有组件以 `Em` 前缀全局可用：

```vue
<template>
  <em-button type="primary">发送消息</em-button>
  <em-avatar :url="user.avatarUrl" />
</template>
```

也可以通过 `app.use(UIKit, { prefix: 'My' })` 自定义前缀，例如 `EmButton` 会注册为 `MyButton`。

## 按需引入

如果希望减小打包体积，可使用 `unplugin-vue-components` 配合官方解析器实现按需引入：

```ts
// vite.config.ts
import Components from 'unplugin-vue-components/vite'
import { EasemobUIKitResolver } from '@easemob/uikit/resolver'

export default {
  plugins: [
    Components({
      resolvers: [EasemobUIKitResolver()],
    }),
  ],
}
```

启用后，模板中出现的 `Em*` 组件会被自动导入，无需手动注册：

```vue
<template>
  <em-toast />
  <em-user-card :user="user" />
</template>
```

## 初始化与登录

### 方式一：EmUIKitProvider（推荐）

`EmUIKitProvider` 是业务容器模块的顶层 Provider，负责创建 SDK Client、注册事件与拉取登录后数据：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-contact
    enable-presence
  >
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

### 方式二：组合式函数

不依赖容器组件时，可通过 `useClient()` 手动初始化与登录：

```ts
import { useClient } from '@easemob/uikit'

const { init, login, logout, isLoggedIn, currentUser } = useClient()

// 初始化 SDK（appKey 必填）
await init({ appKey: 'your-app-key' })

// 登录：支持 accessToken 或密码
await login({ accessToken: 'token' })
// 或
await login({ userId: 'user1', password: '123456' })

// 登出
await logout()
```

登录成功后，`isLoggedIn` 变为 `true`，`currentUser` 为当前用户信息，业务容器组件将自动开始渲染数据。

## 下一步

- 了解 [主题定制](./theme) 与暗色模式
- 浏览 [组件文档](../components/button) 查看全部原子组件
- 接入 [业务模块](../components/conversation-container) 快速搭建 IM 界面
