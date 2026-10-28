# 快速开始

本节介绍如何在项目中安装并接入 `@easemob-community/uikit-im`。

## 环境要求

- Vue `^3.3.0`
- Pinia `^2.1.0 || ^4.0.0`
- Node.js `^18.0.0`

## 安装

```bash
# 5.x 公开版（绝大多数接入方）
pnpm add @easemob-community/uikit-im @easemob-community/uikit-sdk-websdk5 pinia vue

# 4.x SDK 则换装对应适配器：
# pnpm add @easemob-community/uikit-im @easemob-community/uikit-sdk-webim4 pinia vue
```

> 组件库将 `pinia` 与 `vue` 声明为 peerDependencies，需要在使用方项目中显式安装。
> SDK 适配器包（`@easemob-community/uikit-sdk-websdk5` / `@easemob-community/uikit-sdk-webim4`）是 **optional peer 依赖，不会被包管理器自动安装**，请按所用 SDK 版本二选一显式安装。
> `@easemob-community/uikit-core` / `@easemob-community/uikit-sdk-contract` 是 uikit-im 的普通 dependencies，会随安装自动带上，**无需也不建议直接依赖**——3.7.11 起 core 的常用 store / 工具函数 / 业务类型已从 uikit-im 主入口透出（如 `useUserInfoStore`、`UiContact`、`UiPresence` 等），业务代码 import 一律走 `@easemob-community/uikit-im`。

> [!IMPORTANT]
> **主题样式需要单独引入**：构建产物将 CSS 提取为独立文件（子路径 `@easemob-community/uikit-im/theme`），入口 JS 不会自动注入样式，请在入口处加一行 `import '@easemob-community/uikit-im/theme'`（见下方示例）。

## 全局注册

在入口文件中注册 Pinia 与 UIKit 插件：

```ts
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import UIKit from '@easemob-community/uikit-im'
import '@easemob-community/uikit-im/websdk5' // 注册 websdk5 为默认 SDK 适配器（3.0 起必需，见下方说明）
import '@easemob-community/uikit-im/theme' // 引入主题样式（构建产物 CSS 提取为独立文件，需手动引入）
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(UIKit)
app.mount('#app')
```

> **3.0 起必须显式 import SDK 子路径入口**：主入口 `@easemob-community/uikit-im` 不再包含任何 SDK adapter 的静态引用（保证 4.x / 5.x 产物摇树隔离），`import '@easemob-community/uikit-im/websdk5'` 通过副作用把 websdk5 注册为默认适配器，Provider 不传 `adapter` prop 时自动使用。4.x 请改用 `import '@easemob-community/uikit-im/webim4'`。两种入口的差异见 [进阶指南 - SDK 适配器](./advanced#sdk-适配器)。

注册后，所有组件以 `Em` 前缀全局可用：

```vue
<template>
  <em-button type="primary">发送消息</em-button>
  <em-avatar :src="user.avatarUrl" />
</template>
```

也可以通过 `app.use(UIKit, { prefix: 'My' })` 自定义前缀，例如 `EmButton` 会注册为 `MyButton`。

## 按需引入

如果希望减小打包体积，可使用 `unplugin-vue-components` 配合官方解析器实现按需引入：

```ts
// vite.config.ts
import Components from 'unplugin-vue-components/vite'
import { EasemobUIKitResolver } from '@easemob-community/uikit-im/resolver'

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

> 按需引入只解决组件注册，**默认 SDK 适配器仍需单独注册**：入口处保留 `import '@easemob-community/uikit-im/websdk5'`（4.x 用 `webim4`）。

## 初始化与登录

### 方式一：EmUIKitProvider（推荐）

`EmUIKitProvider` 是业务容器模块的顶层 Provider，负责创建 SDK Client、注册事件与拉取登录后数据：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob-community/uikit-im'
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
import { useClient } from '@easemob-community/uikit-im'

const { init, login, logout, isLoggedIn, currentUser } = useClient()

// 初始化 SDK（appKey / appId 二选一；appId 为 SDK 5.1+ 能力，仅 websdk5）
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
