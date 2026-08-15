# Provider 全局配置（EmUIKitProvider）

`EmUIKitProvider` 是 UIKit 的**顶级容器组件**：所有组件（会话列表、聊天、通讯录、群组、原子组件）都必须在它内部渲染。它负责：

- **SDK 连接与登录**：用 `appKey` 创建环信 SDK Client 并初始化 Domain/事件管线
- **功能开关（features）**：好友体系、在线状态、群组、用户资料、草稿、@我、正在输入等模块的启停（运行时切换即时生效）
- **全局主题 / 国际化 / 动画 / H5 适配**：一套配置作用于全部组件
- **数据源接管（dataSource）**：业务侧完全接管联系人/群组/在线状态/用户资料等数据获取
- **通知与日志**：页内通知 / 浏览器系统通知 / 系统通知文案定制 / IndexedDB 日志持久化

## 功能范围总览

| 能力域 | 相关配置 |
| --- | --- |
| 连接与登录 | `appKey`、`sdkConfig`、`autoInit`、`onTokenWillExpire`、`onTokenExpired` |
| 功能开关 | `enableContact`、`contactFetchMode`、`enableBlocklist`、`enablePresence`、`enableGroup`、`enableUserInfo`、`enableUserInfoSubscription`、`enableDraft`、`enableAtMe`、`enableTyping`、`enableToast` |
| 主题 | `theme`（模式 / 品牌色 / 间距 / 圆角 / 字号 / 密度 / 气泡与背景色） |
| 国际化 | `locale`（zh-CN / en） |
| 动画与 H5 | `animation`（开关 / 强度 / 波纹）、`h5`（安全区 / 键盘 / 下拉刷新） |
| 数据源接管 | `dataSource`（联系人 / 黑名单 / 群组 / 在线状态 / 用户资料 / 搜索 / 加好友 / 建群） |
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
- 未配置 `appKey` 时 Provider 仍会创建上下文，但 client 无法完成登录。
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
