# Store 状态管理指南

UIKit 基于 **Pinia** 管理全局状态：会话列表、聊天、通讯录、群组等组件内部消费一组 setup stores，业务代码可通过 `useXxxStore()` 读取状态或注入数据。

::: tip 依赖
- UIKit 不自带 Pinia：项目需先 `app.use(createPinia())`。
- Store 需在 `EmUIKitProvider` 上下文内使用，内部依赖 SDK Client 与 Domain 事件管线。
:::

## Store API 索引

| Store | 职责 | 参考 |
| --- | --- | --- |
| `useClientStore` | SDK 连接、登录态与账号失效 | [连接状态 API](/api/stores/use-client-store) |
| `useConversationStore` | 会话列表、当前会话与同步状态 | [会话 Store API](/api/stores/use-conversation-store) |
| `useMessageStore` | 消息列表、发送状态与缓存 | [消息 Store API](/api/stores/use-message-store) |
| `useContactStore` | 联系人、黑名单与邀请 | [联系人 Store API](/api/stores/use-contact-store) |
| `useGroupStore` | 群资料、成员与管理数据 | [群组 Store API](/api/stores/use-group-store) |
| `usePresenceStore` | 在线状态与订阅集合 | [在线状态 Store API](/api/stores/use-presence-store) |
| `useThemeStore` | 主题 token 与组件形态 | [主题 Store API](/api/stores/use-theme-store) |

::: info 用户资料 Store
用户资料由 `useUserInfoStore` 管理，主要在 UIKit 内部使用。业务侧优先通过 [`useUserInfo`](/api/composables/use-user-info) 或 [`useOwnUserInfo`](/api/composables/use-own-user-info) 读取和更新。
:::

## 响应式读取

组件外读取 store 的 getter 会保持响应式。需要解构时配合 `storeToRefs`：

```ts
import { storeToRefs } from 'pinia'
import { useConversationStore } from '@easemob-community/uikit-im'

const conversationStore = useConversationStore()
const { currentConversation, sortedConversationList } = storeToRefs(conversationStore)
```

## Mock 数据注入

无 SDK 连接时，可以向 store 注入数据以渲染文档演练场或测试界面：

```ts
conversationStore.setConversationList(mockConversations)
conversationStore.setAtMe('group_1', true)
messageStore.messageMap[conversationId] = mockMessages
presenceStore.updateBatch(mockPresence)
```

`EmUIKitProvider(:auto-init="false")` 配合 store 注入即可免登录渲染。消息缓存与淘汰配置见[消息 Store API](/api/stores/use-message-store)。

## 直接写 Store 的约束

- **真实业务优先走 `dataSource` / SDK 事件管线**：store 会被 SDK 事件自动维护，直接写入可能与事件同步相互覆盖。
- `messageMap` 直接赋值是**替换整组消息**，不是追加；追加使用 `addMessage`。
- 写入方法主要用于初始化占位、mock/演示和业务自有数据源。自有数据源建议通过 Provider 的 `dataSource` 接管。
- 数据同步进度使用 [`useSyncStatus`](/api/composables/use-sync-status)，不要根据单个 store 的加载字段自行拼接全局状态。

## 关联

- [Store API 分类](/api/stores/)
- [Provider 全局配置](./provider)
- [消息列表演练场](./message-list)
