# 组件清单与分类（Em 前缀 / resolver / 业务容器 / 组合式函数）

所有组件以 `Em` 前缀具名导出，全局注册后模板可用 `<em-xxx>`（kebab）或 `<EmXxx>`（Pascal）。

## 顶级容器

| 组件 | 用途 |
| --- | --- |
| `EmUIKitProvider` | **顶级容器**，所有业务组件必须写在它内部；负责 SDK 连接、功能开关、主题/国际化/H5、数据源、通知、日志 |

## 业务容器（搭骨架用）

| 组件 | 用途 |
| --- | --- |
| `EmChatContainer` | 聊天模块：会话列表 + 聊天窗口的经典布局 |
| `EmConversationContainer` | 会话列表容器 |
| `EmContactContainer` | 通讯录聚合容器（好友 / 群组 / 黑名单） |
| `EmAddressBookContainer` | 地址簿容器（组织架构通讯录） |
| `EmContactListContainer` | 联系人列表容器 |
| `EmGroupListContainer` | 群组列表容器 |

典型骨架：

```vue
<EmUIKitProvider app-key="your-app-key" enable-contact enable-presence>
  <EmConversationContainer />
  <EmChatContainer />
</EmUIKitProvider>
```

## 原子基础组件（常用）

反馈类：`EmToast`、`EmModal`、`EmPopup`、`EmActionSheet`、`EmStatusBanner`、`EmNotification`、`EmNotificationContainer`、`EmImageViewer`
数据类：`EmAvatar`、`EmPresenceAvatar`、`EmPresenceSelector`、`EmUserCard`、`EmGroupCard`、`EmBadge`、`EmEmpty`、`EmCell`
输入/交互类：`EmButton`、`EmIconButton`、`EmIcon`、`EmInput`、`EmEmojiPicker`、`EmScrollToTop`、`EmResizable`、`EmCopyableText`

## 业务模块子组件（高级定制用）

`@easemob/uikit` 还导出大量业务模块子组件，供深度定制插槽/列表项时复用。按域分组（均为 `Em` 前缀具名导出）：

- 会话：`EmConversationList`、`EmConversationItem`、`EmConversationTabs`、`EmNewChatModal`、`EmAddContactModal`、`EmCreateGroupModal`
- 聊天：`EmChat`、`EmMessageList`、`EmMessageInput`、`EmMessageVirtualList`、`EmMessageRenderer`、`EmMessageBubbleWrapper`、`EmMessageInteractive`、`EmMessageActionMenu`、`EmMentionPicker`、`EmForwardModal`、`EmGroupReadReceiptModal`、`EmChatInfoDrawer`，以及各类型气泡 `EmTextMessage` / `EmImageMessage` / `EmVoiceMessage` / `EmVideoMessage` / `EmFileMessage` / `EmCustomMessage` / `EmLocationMessage`
- 联系人：`EmContactList`、`EmContactItem`、`EmContactDetail`、`EmContactAlphabetNav`、`EmContactNoticeList` 等
- 群组：`EmGroupList`、`EmGroupItem`、`EmGroupDetail`、`EmGroupMemberList`、`EmGroupAnnouncement`、`EmInviteMemberModal`、`EmGroupManagementSection`、`EmGroupMuteList`、`EmGroupBlocklist`、`EmGroupAllowlist`、`EmGroupSharedFileList`、`EmGroupJoinRequestList`

> 完整导出以 `@easemob/uikit` 包内具名导出为准；上表是高频入口。

## 按需引入 resolver

```ts
import Components from 'unplugin-vue-components/vite'
import { EasemobUIKitResolver } from '@easemob/uikit/resolver'

export default {
  plugins: [Components({ resolvers: [EasemobUIKitResolver()] })],
}
```

resolver 默认解析 `Em` 前缀组件到 `@easemob/uikit`，可传 `{ prefix: 'My' }` 自定义。

## 组合式函数（与组件同构）

| 组合式函数 | 用途 |
| --- | --- |
| `useClient()` | SDK 客户端：`init / login / logout / isLoggedIn / currentUser` |
| `useChat()` | 聊天状态与消息发送 |
| `useConversation()` | 会话列表与切换 |
| `useContact()` | 好友 / 陌生人 / 黑名单 |
| `useGroup()` | 群组列表与详情 |
| `usePresence()` | 在线状态订阅与发布 |
| `useUserInfo()` | 用户资料（昵称 / 头像） |
| `useTheme()` | 主题运行时定制 |
| `useToast()` | 轻提示 |
| `useNotification()` | 消息通知 |
| `useLocale()` | 国际化 `t / setLocale` |
| `useUIKit()` / `useUIKitProvider()` | 读取 Provider 全局配置 / 手动初始化 |
| `useH5Adaptation()` | 安全区 / 键盘 / 下拉刷新 |

工具函数：`mergeLocaleMessages`、`findLocaleKey`、`setKeyboardShortcutsEnabled`、`isKeyboardShortcutsEnabled`。

## API 明细

- `reference/api/*.md`：22 个原子组件 + 4 个业务模块 + `uikit-provider` 的 props/emits/slots 自动生成表。
- 组件页完整文档见文档站 `apps/docs/components/*`。
