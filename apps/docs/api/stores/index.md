# Stores

UIKit 使用 Pinia setup stores 管理状态。先完成 `app.use(createPinia())`，真实业务优先通过 composables 和 SDK 事件管线写入。

- [useClientStore](/api/stores/use-client-store)：连接、当前用户和账号失效状态。
- [useConversationStore](/api/stores/use-conversation-store)：会话列表、当前会话和同步状态。
- [useMessageStore](/api/stores/use-message-store)：消息、发送状态、置顶与缓存。
- [useContactStore](/api/stores/use-contact-store)：联系人、黑名单和邀请。
- [useGroupStore](/api/stores/use-group-store)：群资料、成员和公告。
- [usePresenceStore](/api/stores/use-presence-store)：在线状态与订阅集合。
- [useThemeStore](/api/stores/use-theme-store)：主题配置与 CSS 变量。

响应式读取和 mock 注入场景见[Store 状态管理指南](/components/stores)。
