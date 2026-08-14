# Store 状态管理（Pinia Stores）

UIKit 基于 **Pinia** 管理全局状态：所有组件（会话列表、聊天、通讯录、群组等）内部
消费一组 setup-store，业务代码可通过 `useXxxStore()` 直接读取或注入数据。

::: tip 依赖
- UIKit 不自带 pinia：项目需先 `app.use(createPinia())`（Provider 或文档演练场由运行环境注入）。
- Store 需在 `EmUIKitProvider` 上下文内使用（内部依赖 SDK Client / Domain 事件管线）。
:::

## Store 总览

| Store | 职责 | 核心 state | 常用读取 |
| --- | --- | --- | --- |
| `useClientStore` | SDK 连接与登录态 | `client` / `connected` / `connecting` / `currentUser` / `appKey` | `isLoggedIn`（computed） |
| `useConversationStore` | 会话列表与当前会话 | `conversationList` / `currentConversationId` / `atMeMap` / `typingMap` | `currentConversation` / `sortedConversationList` |
| `useMessageStore` | 消息列表与发送状态 | `messageMap`（会话 ID → `UiMessage[]`）/ `pinnedMessageMap` / `atMeMessageMap` | 按会话读消息数组 |
| `useContactStore` | 联系人 / 黑名单 / 邀请 | `contactList` / `blackList` / `inviteList` / `selectedIds` | `contactCount` |
| `useGroupStore` | 群资料 / 成员 / 管理 | `groupList` / `currentGroup` / `groupMembersMap` / `groupAnnouncementMap` / 禁言/黑白名单/共享文件 map | `joinedGroupCount` |
| `usePresenceStore` | 在线状态 | `presenceMap` / `subscribedUserIds` | `onlineUserIds` |
| `useThemeStore` | 主题 token 与形态 | `primaryColor` / `mode` / `avatarShape` / `bubbleShape` / `density` / `fontSizeScale` 等 | `effectiveMode` |

::: info 用户资料 Store
用户资料（昵称 / 头像 / 在线状态订阅）由 `useUserInfoStore` 管理，主要在 UIKit
内部（`useUserInfo` composable）使用，业务侧一般通过组件展示即可，无需直接读写。
:::

## 各 Store 说明

### useClientStore（连接与登录）

SDK Client 实例与连接状态：

```ts
import { useClientStore } from '@easemob/uikit'

const { connected, currentUser, isLoggedIn, setCurrentUser } = useClientStore()
```

### useConversationStore（会话）

```ts
const store = useConversationStore()
store.setConversationList(list)          // 注入会话列表（docs 演练场模式）
store.setCurrentConversationId(cvsId)    // 切换当前会话
store.updateUnreadCount(cvsId, 0)        // 更新未读数
store.setAtMe(cvsId, true)               // 标记 @我
const current = store.currentConversation // getter：当前会话对象
const sorted = store.sortedConversationList // getter：置顶 + 时间排序后的列表
```

### useMessageStore（消息）

`messageMap` 以会话 ID 为键存放消息数组：

```ts
const store = useMessageStore()
const messages = store.messageMap[conversationId] ?? []
store.addMessage(msg)                      // 追加一条消息
store.updateMessageStatus(msgId, 'read')   // 更新消息状态
store.markFailed(localId, reason)          // 发送失败标记
```

### useContactStore / useGroupStore / usePresenceStore（通讯录 / 群 / 在线状态）

```ts
useContactStore().setContactList(contacts)
useGroupStore().setGroupList(groups)
useGroupStore().groupMembersMap[groupId] = members   // 直接注入成员（演练场模式）
usePresenceStore().updateBatch([{ userId, status: 'online', ext: '', lastTime: Date.now() }])
```

### useThemeStore（主题）

主题 token 写入 `documentElement` CSS 变量（`--uikit-*`），运行时修改即时生效：

```ts
const themeStore = useThemeStore()
themeStore.setPrimaryColor(203)      // 品牌色相
themeStore.setFontSize('large')      // 字号档位（适老）
themeStore.setDensity('comfortable') // 密度档位
themeStore.setAvatarShape('square')  // 头像形状
```

## 业务使用场景

### 1. 响应式读取（自定义展示）

组件外读取 store 的 getter 会保持响应式（Pinia setup-store 解包）：

```ts
import { storeToRefs } from 'pinia'

const conversationStore = useConversationStore()
const { currentConversation, sortedConversationList } = storeToRefs(conversationStore)
```

### 2. Mock 数据注入（免登录渲染 / 文档演练场）

无 SDK 连接时向 store 直灌数据即可渲染（docs 在线演练场与 Histoire story 同款模式）：

```ts
conversationStore.setConversationList(mockConversations)
conversationStore.setAtMe('group_1', true)
messageStore.messageMap[conversationId] = mockMessages
presenceStore.updateBatch(mockPresence)
```

### 3. 直接写 store 的注意点

- **真实业务优先走 `dataSource` / SDK 事件管线**：store 会被 SDK 事件（消息、
  会话同步、群变更等）自动维护，直接写 store 会与事件同步相互覆盖。
- `messageMap` 直接赋值是**替换整组消息**（不是追加）；追加请用 `addMessage`。
- Store 的写入方法主要用于：初始化占位、mock/演示、业务自有数据源（此时建议
  配合 Provider 的 `dataSource` 接管，而非绕过事件管线直写）。

## 关联

- 全局配置：见 [Provider 全局配置](./provider)
- 在线演练场 mock 注入模式：见各组件页「在线代码演练场」的 `mock.ts` 模板
