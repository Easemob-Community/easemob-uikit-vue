# 快速开始（安装 / 注册 / 最小接入 / useClient 登录）

## 环境要求

- Vue `^3.3.0`
- Pinia `^2.1.0`
- Node.js `^18.0.0`

## 安装

```bash
pnpm add @easemob/uikit pinia vue
```

> `pinia` 与 `vue` 是 `@easemob/uikit` 的 peerDependencies，**接入方必须显式安装**。
> `@easemob/uikit` 入口已内置主题样式，接入后**无需**再单独引入 CSS。

## 全局注册

```ts
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())   // UIKit 依赖 pinia，必须先注册
app.use(UIKit)
app.mount('#app')
```

注册后所有组件以 `Em` 前缀全局可用：

```vue
<template>
  <em-button type="primary">发送消息</em-button>
  <em-avatar :url="user.avatarUrl" />
</template>
```

自定义前缀：`app.use(UIKit, { prefix: 'My' })`，`EmButton` 会注册为 `MyButton`。

## 按需引入（unplugin-vue-components）

```ts
// vite.config.ts
import Components from 'unplugin-vue-components/vite'
import { EasemobUIKitResolver } from '@easemob/uikit/resolver'

export default {
  plugins: [
    Components({
      resolvers: [EasemobUIKitResolver()], // 可传 { prefix: 'My' }
    }),
  ],
}
```

启用后模板里 `Em*` 组件自动导入，无需手动注册，也无需 `app.use(UIKit)`（pinia 仍需自行注册）。

## 最小接入（EmUIKitProvider）

`EmUIKitProvider` 是业务容器的**顶级容器**：创建 SDK Client、注册事件、拉取登录后数据。
所有业务组件必须写在它内部：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    enable-contact
    enable-presence
  >
    <em-conversation-container />
    <em-chat-container />
  </EmUIKitProvider>
</template>
```

> `appKey` 必填，格式为 `orgName#appName`，在环信控制台创建应用获取。

## 手动初始化与登录（useClient）

不依赖容器组件、或需要延迟初始化时，用 `useClient()`：

```ts
import { useClient } from '@easemob/uikit'

const { init, login, logout, isLoggedIn, currentUser } = useClient()

// 初始化 SDK（appKey 必填）
await init({ appKey: 'your-app-key' })

// 登录：accessToken 或 密码
await login({ accessToken: 'token' })
// 或
await login({ userId: 'user1', password: '123456' })

// 登出
await logout()
```

登录成功后 `isLoggedIn` 变 `true`，`currentUser` 为当前用户，业务容器自动开始渲染数据。

## 下一步

- 配置 Provider 全量能力：`reference/provider.md`
- 选择组件/容器：`reference/components.md`
- 主题定制：`reference/theming.md`
- H5 适配：`reference/h5.md`
