# Provider 全局配置（EmUIKitProvider）

`EmUIKitProvider` 是 UIKit 的**顶级容器组件**：所有组件（会话列表、聊天、通讯录、群组、原子组件）都必须在它内部渲染。它负责：

- **SDK 连接与登录**：用 `appKey` / `appId`（二选一；appId 为 SDK 5.1+ 能力，仅 websdk5）创建环信 SDK Client 并初始化 Domain/事件管线
- **功能开关（features）**：好友体系、在线状态、群组、用户资料、草稿、@我、正在输入等模块的启停（运行时切换即时生效）
- **全局主题 / 国际化 / 动画 / H5 适配**：一套配置作用于全部组件
- **数据源接管（dataSource）**：业务侧完全接管联系人/群组/在线状态/用户资料等数据获取
- **通知与日志**：页内通知 / 浏览器系统通知 / 系统通知文案定制 / IndexedDB 日志持久化

## 功能范围总览

| 能力域 | 相关配置 |
| --- | --- |
| 连接与登录 | `appKey` / `appId`（二选一）、`sdkConfig`、`autoInit`、`adapter`（注入模式）、`onTokenWillExpire`、`onTokenExpired` |
| 功能开关 | `enableContact`、`contactFetchMode`、`enableBlocklist`、`enablePresence`、`enableGroup`、`enableUserInfo`、`enableUserInfoSubscription`、`enableDraft`、`enableAtMe`、`enableTyping`、`filterBlockedContacts`、`showNicknameInSingleChat`、`showNicknameInGroupChat`、`enableToast` |
| 主题 | `theme`（模式 / 品牌色 / 间距 / 圆角 / 字号 / 密度 / 气泡与背景色） |
| 国际化 | `locale`（zh-CN / en） |
| 动画与 H5 | `animation`（开关 / 强度 / 波纹）、`h5`（安全区 / 键盘 / 下拉刷新） |
| 数据源接管 | `dataSource`（薄别名，4.0.0 移除）、`sdkConfig.repositories`（推荐，六域数据入口） |
| 能力查询 | `useUIKit().capabilities`（SDK 客观能力矩阵） |
| 通知 | `notification`（页内弹窗 / 浏览器通知 / 触发模式 / 权限）、`noticeConfig`（系统通知文案与过滤） |
| 日志 | `logger`（IndexedDB 落库 / SDK 日志收集 / 级别 / 保留策略） |

## 最小接入

组件以 `EmUIKitProvider` 为名导出，全局注册后作为应用根容器使用：

```vue
<script setup lang="ts">
import { createPinia } from 'pinia'
// UIKit 需要 pinia 实例（组件内部 store 依赖）
</script>

<template>
  <EmUIKitProvider app-key="your-app-key">
    <!-- 业务容器 / 组件都放在 Provider 内 -->
    <EmChatContainer />
  </EmUIKitProvider>
</template>
```

::: tip 依赖说明
- `EmUIKitProvider` 不自带 pinia：项目需自行 `app.use(createPinia())`（文档站演示、在线演练场中由运行环境注入）。
- 未配置 `appKey` / `appId` 时 Provider 仍会创建上下文，但 client 无法完成登录。
:::

## 常见配置

### 延迟初始化（autoInit）

`autoInit=false` 时不自动建立 SDK 连接，适合等待登录态 / 异步获取 token 后再初始化：

```vue
<EmUIKitProvider :auto-init="false" :app-key="appKey">
  <EmChatContainer />
</EmUIKitProvider>
```

::: tip 说明
`EmUIKitProvider` 不对外 emit 事件（无 `ready` 等）；初始化完成状态可通过
`useUIKitProvider()`（composable 层）获取与手动触发 `init()`。
:::

### Token 过期回调

```vue
<EmUIKitProvider
  app-key="your-app-key"
  :on-token-will-expire="refreshToken"
  :on-token-expired="handleTokenExpired"
>
  <EmChatContainer />
</EmUIKitProvider>
```

### 数据源接管（dataSource）

业务自有后端时，通过 `dataSource` 接管数据获取（不传走 SDK 默认实现）：

```ts
const dataSource = {
  // 拉取联系人列表
  fetchContacts: async () => ({ list: myContacts, hasMore: false }),
  // 订阅在线状态（返回后由 UIKit 管理）
  subscribePresence: async (userIds) => { /* ... */ },
  // 服务端按手机号/邮箱搜索用户
  searchUsers: async (keyword) => mySearchUsers(keyword),
}
```

```vue
<EmUIKitProvider app-key="your-app-key" :data-source="dataSource">
  <EmChatContainer />
</EmUIKitProvider>
```

### SDK 适配器注入（adapter）

Provider 需要一个 SDK 适配器（`SdkAdapter`，对接具体版本的环信 SDK）才能工作，两种装配方式二选一：

- **内置模式（默认，推荐）**：入口文件 `import '@easemob-community/uikit-im/websdk5'`（4.x 用 `@easemob-community/uikit-im/webim4`），import 副作用把对应 adapter 注册为默认适配器，Provider 不传 `adapter` 时自动使用，UIKit 全权管理连接生命周期（init / login / logout）
- **注入模式**：业务从 adapter 包取出实例显式传入 `adapter` prop，连接生命周期（login / logout）归业务全权负责——`useClient().login()` / `useClient().logout()` 不会转发到 adapter，业务直接调用自己持有的 `adapter.login(user, token)` / `adapter.logout()`

```ts
import { Websdk5Adapter } from '@easemob-community/uikit-sdk-websdk5'

const adapter = new Websdk5Adapter()
// 业务侧自行登录：await adapter.login(userId, token)
```

```vue
<EmUIKitProvider :adapter="adapter" app-key="your-app-key">
  <EmChatContainer />
</EmUIKitProvider>
```

### 数据入口接管（sdkConfig.repositories）

`dataSource` prop 已收口为 repository 注入的薄别名（装配时逐项翻译，保留至 4.0.0 移除）。新接入推荐经 `sdkConfig.repositories` 按域整体接管数据读路径——`message` / `conversation` / `contact` / `group` / `presence` / `userInfo` 六域均为可选的部分方法覆盖，显式 `repositories` 优先于 `dataSource` 翻译结果：

```vue
<EmUIKitProvider
  app-key="your-app-key"
  :sdk-config="{
    repositories: {
      conversation: { fetchConversations: myFetchConversations },
      contact: { fetchContacts: myFetchContacts, fetchBlocklist: myFetchBlocklist },
      userInfo: { fetchUserInfos: myFetchUserInfos },
    },
  }"
>
  <EmChatContainer />
</EmUIKitProvider>
```

写路径旁路落库（Electron 本地库 SQLite 场景）另见 `sdkConfig.persistence` 钩子，详见 [进阶指南 - 旁路持久化](../guide/advanced#旁路持久化sdkconfigpersistence)。

### 能力查询（capabilities）

不同 SDK 版本的能力差异由 adapter 如实上报到 `useUIKit().capabilities`（`combineMessage` / `pinnedMessage` / `streamingMessage` / `groupReadReceipt` 四个能力位，adapter 未上报时缺省全 `true`），与 features（业务开关）取交集决定能力入口的展示：

```ts
import { useUIKit } from '@easemob-community/uikit-im'

const { capabilities } = useUIKit()

if (capabilities.combineMessage) {
  // 当前 adapter 背后的 SDK 支持合并消息，可展示合并转发入口
}
```

非 Vue 上下文（定时任务、主进程等）可用 core 的模块级 `getUIKitAdapter()`（`@easemob-community/uikit-core`）读取当前装配的适配器实例，Provider 未挂载或已卸载时返回 `null`。

### 通知与日志

```vue
<EmUIKitProvider
  app-key="your-app-key"
  :notification="{
    browser: true,            // 浏览器系统通知
    inApp: true,              // 页内右上角弹窗
    triggerMode: 'background',// 仅页面隐藏时触发
    onNotify: (item, channel) => playRingtone(), // 送达回调（自定义铃声等，见 Notification 指南）
  }"
  :logger="{
    enabled: true,            // IndexedDB 持久化
    collectSdkLog: false,     // 默认不收集 SDK 日志
    uikitLevel: 'info',       // 生产建议 info
    maxEntries: 5000,
    retentionDays: 7,
  }"
>
  <EmChatContainer />
</EmUIKitProvider>
```

更多能力（主题定制、系统通知文案、H5 适配、日志导出）见对应指南页。

## API

<!-- @include: ../.vitepress/gen/uikit-provider.md -->
