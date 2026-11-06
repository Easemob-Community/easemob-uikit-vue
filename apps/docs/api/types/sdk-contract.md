# SDK 中立契约

UIKit 主入口以类型方式透出适配器和中立业务契约，使业务代码不直接绑定具体 SDK 实现。

## 主要类型

- `UIKitContext`：Provider 提供的客户端、domains、stores、features 和生命周期入口。
- `UiMessage`、`UiConversation`、`UiContact`、`UiGroup`、`UiGroupMember`、`UiPresence`：中立业务对象。
- `NoticeConfig`、`NoticeContext`、`NoticeInsertContext`：系统通知配置与上下文。
- `LogPersistenceConfig`、`PersistedLogEntry`、`PersistedLogFilter`、`PersistedLogLevel`：日志持久化类型。
- `LocaleMessages`、`FindLocaleKeyOptions`：国际化配置类型。

## 通知工具

`createNoticeMessage`、`insertChatNotice`、`isNoticeMessage`、`buildAnnouncementNoticeText`、`resolveNoticeUserName` 用于构建、识别和插入系统通知。

## 消息转换

`toUiMessage`、`toUiMessages` 将 SDK 中立输入转换为 UIKit 消息对象；`formatSdkError` 规范化 SDK 错误。

SDK5 适配器的值级注册从 `@easemob-community/uikit-im/websdk5` 子路径引入，不从主入口静态加载，以保留摇树隔离。
