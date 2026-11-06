# Composables

组合式函数封装 UIKit 的响应式业务能力。除特别说明外，业务 API 需要在 `EmUIKitProvider` 上下文中使用。

## 核心与连接

- [useUIKit](/api/composables/use-uikit)：读取完整 Provider 上下文。
- [useUIKitProvider](/api/composables/use-uikit-provider)：装配自定义 Provider。
- [useClient](/api/composables/use-client)：连接、登录和初始化。
- [useSyncStatus](/api/composables/use-sync-status)：数据同步进度。
- [useUIKitStorage](/api/composables/use-uikit-storage)：按应用和用户隔离的持久化状态。

## 消息与会话

- [useChat](/api/composables/use-chat)：聊天业务聚合入口。
- [useMessage](/api/composables/use-message)：消息查询与常用操作。
- [useMessageSend](/api/composables/use-message-send)：发送与重发消息。
- [useMessageHistory](/api/composables/use-message-history)：历史消息与游标。
- [useMessageActions](/api/composables/use-message-actions)：多选、撤回、删除、翻译和置顶。
- [useConversation](/api/composables/use-conversation)：会话操作与草稿。
- [useConversationTabs](/api/composables/use-conversation-tabs)：会话分栏状态。
- [useQuote](/api/composables/use-quote)：引用、定位和高亮。
- [useChatPlugin](/api/composables/use-chat-plugin)：聊天扩展点上下文。

## 联系人与群组

- [useContact](/api/composables/use-contact)：联系人与申请管理。
- [useContactFilter](/api/composables/use-contact-filter)：联系人筛选。
- [useContactGroup](/api/composables/use-contact-group)：联系人分组。
- [useContactSort](/api/composables/use-contact-sort)：联系人排序。
- [useGroup](/api/composables/use-group)：群组与成员管理。
- [useGroupFilter](/api/composables/use-group-filter)：群组筛选。
- [useGroupSort](/api/composables/use-group-sort)：群组排序。
- [useBlocklist](/api/composables/use-blocklist)：黑名单管理。
- [usePinyin](/api/composables/use-pinyin)：可选拼音适配器。

## 用户、主题与通知

- [useUserInfo](/api/composables/use-user-info)：指定用户资料。
- [useOwnUserInfo](/api/composables/use-own-user-info)：当前用户资料。
- [usePresence](/api/composables/use-presence)：在线状态。
- [useTheme](/api/composables/use-theme)：主题读取与修改。
- [useToast](/api/composables/use-toast)：全局轻提示。
- [useNotification](/api/composables/use-notification)：页内与浏览器通知。

## H5 与交互

- [useH5Adaptation](/api/composables/use-h5-adaptation)：H5 视口与适配状态。
- [useViewport](/api/composables/use-viewport)：视口、键盘与安全区。
- [useKeyboard](/api/composables/use-keyboard)：软键盘状态。
- [useLongPress](/api/composables/use-long-press)：长按手势。
- [usePullRefresh](/api/composables/use-pull-refresh)：下拉刷新。
- [useBottomSheet](/api/composables/use-bottom-sheet)：底部面板手势。
- [useRipple](/api/composables/use-ripple)：涟漪反馈。
- [useResizable](/api/composables/use-resizable)：拖拽调整尺寸。
- [useArrowNavigation](/api/composables/use-arrow-navigation)：方向键导航。
- [useEscToClose](/api/composables/use-esc-to-close)：Escape 关闭。
- [useKeyBindings](/api/composables/use-key-bindings)：键盘快捷键。
