# 进阶指南

本文面向需要深度定制业务行为的开发者，介绍 UIKit 的功能开关、数据源自定义与组合式函数体系。

## 功能开关

`EmUIKitProvider` 通过 `enable*` 系列 prop 控制业务能力的启停，开关响应式生效，运行时切换即可：

- `enableContact`：是否启用好友体系（默认 `false`）
- `enableBlocklist`：是否启用黑名单（默认 `false`）
- `enablePresence`：是否启用在线状态（默认 `false`）
- `enableGroup`：是否启用群组体系（默认 `true`）
- `enableUserInfo`：是否启用用户资料（昵称 / 头像）展示与拉取（默认 `true`）
- `enableUserInfoSubscription`：是否启用陌生人用户资料变更订阅（默认 `true`）
- `enableToast`：是否启用内置 Toast 提示（默认 `true`）
- `contactFetchMode`：联系人拉取模式，`'page'` 或 `'all'`（默认 `'page'`）

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    enable-contact
    enable-presence
    enable-blocklist
    contact-fetch-mode="all"
  >
    <em-contact-container />
  </EmUIKitProvider>
</template>
```

## 自定义数据源

UIKit 允许业务完全接管数据层，通过 `dataSource` prop 传入自定义拉取函数：

```ts
import type { UIKitDataSource } from '@easemob/uikit'

const dataSource: UIKitDataSource = {
  // 会话列表
  async fetchConversations() {
    return [
      {
        conversationId: 'group-123',
        type: 'groupchat',
        name: '产品群',
      },
    ]
  },
  // 好友列表
  async fetchContacts() {
    return { list: [{ userId: 'user1', name: '小明' }] }
  },
  // 群组列表
  async fetchGroups() {
    return { list: [{ groupId: 'group-123', name: '产品群' }] }
  },
  // 黑名单
  async fetchBlocklist() {
    return [{ userId: 'blocked-1', name: '拉黑用户' }]
  },
}
```

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
import { dataSource } from './data-source'
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :data-source="dataSource">
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

## 组合式函数

UIKit 暴露一组与组件同构的组合式函数，业务可直接复用状态与逻辑：

- `useClient()`：SDK 客户端，`init / login / logout / isLoggedIn / currentUser`
- `useChat()`：聊天状态与消息发送
- `useConversation()`：会话列表与切换
- `useContact()`：好友 / 陌生人 / 黑名单
- `useGroup()`：群组列表与详情
- `usePresence()`：在线状态订阅与发布
- `useUserInfo()`：用户资料（昵称 / 头像）
- `useTheme()`：主题运行时定制
- `useToast()`：轻提示
- `useH5Adaptation()`：移动端安全区 / 键盘 / 下拉刷新

例如在业务代码中监听会话切换：

```ts
import { useConversation } from '@easemob/uikit'

const { currentConversation, switchConversation } = useConversation()

function onConversationClick(id: string) {
  switchConversation(id)
}
```

## 用户资料同步

启用 `enableUserInfo` 后，UIKit 会在以下时机自动拉取并缓存用户资料：

- 登录后批量同步
- 收到新消息且发送者资料缺失时
- 会话列表 / 联系人 / 群成员渲染时按需补齐

业务可通过 `useUserInfo()` 手动获取或更新：

```ts
import { useUserInfo } from '@easemob/uikit'

const { getUserInfo, updateOwnUserInfo } = useUserInfo()

// 获取用户资料（含本地缓存）
const info = await getUserInfo('user1')

// 更新自己的昵称与头像
await updateOwnUserInfo({ nickname: '新昵称', avatarUrl: 'https://...' })
```

## H5 与多端适配

移动端场景请阅读 [H5 适配](./h5-adaptation)，覆盖安全区、键盘避让、下拉刷新与手势优化。

## 迁移指南

从历史版本迁移请查阅仓库 [CHANGELOG](https://github.com/easemob/easemob-uikit-vue/blob/main/packages/uikit/CHANGELOG.md)，关注以下破坏性变更点：

- `UIKitProvider` 取代旧的初始化写法，`appKey` 为必填
- 组件统一 `Em` 前缀，旧版非前缀组件名不再注册
- 主题变量名统一为 `--uikit-*`，旧 `--em-*` 变量已废弃
