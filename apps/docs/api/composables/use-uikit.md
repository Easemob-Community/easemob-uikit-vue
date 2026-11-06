# useUIKit

读取当前 `EmUIKitProvider` 提供的完整上下文，包括 SDK 客户端、业务域、stores、功能开关和数据源。

## 导入与签名

```ts
import { useUIKit } from '@easemob-community/uikit-im'

const context = useUIKit()
```

## 返回值

返回 `UIKitContext`，常用字段包括 `client`、`domains`、`stores`、`features`、`dataSource`、`capabilities`、`init`、`login` 和 `logout`。

## 最小用法

```ts
const { stores, logout } = useUIKit()
const conversations = stores.conversation.sortedConversationList

await logout()
```

## 使用边界

必须在 `EmUIKitProvider` 的组件子树内调用，否则抛出错误。退出登录优先使用这里的 `logout()`，它会同时清理 core 与会话、消息、联系人、群组等场景状态。
