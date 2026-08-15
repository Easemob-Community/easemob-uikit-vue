# EmUIKitProvider 配置（features / dataSource / theme / h5 / notification / logger / token）

`EmUIKitProvider` 是 UIKit 的**顶级容器**，负责 SDK 连接登录、功能开关、主题/国际化/动画/H5、数据源接管、
通知与日志。所有业务组件必须在它内部渲染。

## 功能范围总览

| 能力域 | 相关配置 |
| --- | --- |
| 连接与登录 | `appKey`、`sdkConfig`、`autoInit`、`onTokenWillExpire`、`onTokenExpired` |
| 功能开关 | `enableContact`、`contactFetchMode`、`enableBlocklist`、`enablePresence`、`enableGroup`、`enableUserInfo`、`enableUserInfoSubscription`、`enableDraft`、`enableAtMe`、`enableTyping`、`enableToast` |
| 主题 | `theme`（模式 / 品牌色 / 间距 / 圆角 / 字号 / 密度 / 气泡与背景色） |
| 国际化 | `locale`（`zh-CN` / `en`） |
| 动画与 H5 | `animation`、`h5`（安全区 / 键盘 / 下拉刷新） |
| 数据源接管 | `dataSource` |
| 通知 | `notification`、`noticeConfig` |
| 日志 | `logger` |

## 功能开关（features）

开关**响应式生效**，运行时切换即可。默认值如下：

- `enableContact`：好友体系（默认 `false`）
- `enableBlocklist`：黑名单（默认 `false`）
- `enablePresence`：在线状态（默认 `false`）
- `enableGroup`：群组体系（默认 `true`）
- `enableUserInfo`：用户资料展示与拉取（默认 `true`）
- `enableUserInfoSubscription`：陌生人资料变更订阅（默认 `true`）
- `enableToast`：内置 Toast（默认 `true`）
- `enableDraft`：会话列表草稿提示（默认 `true`）
- `enableAtMe`：会话列表「@我」提示（默认 `true`）
- `enableTyping`：单聊「对方正在输入」（默认 `true`）
- `contactFetchMode`：联系人拉取模式 `'page'`（默认）/ `'all'`

```vue
<EmUIKitProvider
  app-key="your-app-key"
  enable-contact
  enable-presence
  enable-blocklist
  contact-fetch-mode="all"
>
  <em-contact-container />
</EmUIKitProvider>
```

## 延迟初始化（autoInit）

`autoInit=false` 时不自动建立 SDK 连接，适合等待登录态 / 异步获取 token：

```vue
<EmUIKitProvider :auto-init="false" :app-key="appKey">
  <EmChatContainer />
</EmUIKitProvider>
```

之后手动触发：`const { init } = useClient(); await init({ appKey })`。

> `EmUIKitProvider` 不对外 emit 事件；初始化状态通过 `useUIKitProvider()` 获取与手动 `init()`。

## Token 过期回调

```vue
<EmUIKitProvider
  app-key="your-app-key"
  :on-token-will-expire="refreshToken"
  :on-token-expired="handleTokenExpired"
>
  <EmChatContainer />
</EmUIKitProvider>
```

## 数据源接管（dataSource）

业务自有后端时，通过 `dataSource` 完全接管数据获取（不传走 SDK 默认实现）：

```ts
import type { UIKitDataSource } from '@easemob/uikit-im'

const dataSource: UIKitDataSource = {
  async fetchConversations() { /* ... */ },
  async fetchContacts() { return { list: [...], hasMore: false } },
  async fetchGroups() { return { list: [...] } },
  async fetchBlocklist() { return [...] },
  async searchUsers(keyword) { /* ... */ },
}
```

```vue
<EmUIKitProvider app-key="your-app-key" :data-source="dataSource">
  <em-conversation-container />
</EmUIKitProvider>
```

## 通知与日志

```vue
<EmUIKitProvider
  app-key="your-app-key"
  :notification="{
    browser: true,             // 浏览器系统通知
    inApp: true,               // 页内右上角弹窗
    triggerMode: 'background', // 'background' 仅页面隐藏 | 'always' 非当前会话即触发
  }"
  :logger="{
    enabled: true,             // IndexedDB 持久化
    collectSdkLog: false,      // 默认不收集 SDK 日志
    uikitLevel: 'info',        // 生产建议 info
    maxEntries: 5000,
    retentionDays: 7,
  }"
>
  <EmChatContainer />
</EmUIKitProvider>
```

## 主题 / H5 / 国际化（声明式）

```vue
<EmUIKitProvider
  app-key="your-app-key"
  locale="zh-CN"
  :theme="{ mode: 'dark', primaryColor: 262, shape: 'square', density: 'compact' }"
  :h5="{ safeArea: true, keyboardAdapt: true, pullRefresh: 'auto' }"
>
  <EmChatContainer />
</EmUIKitProvider>
```

- `theme`：见 `reference/theming.md`
- `h5`：见 `reference/h5.md`
- `locale`：`'zh-CN'` / `'en'`，运行时也可 `useLocale().setLocale('en')`

## API 明细

Props 完整类型与默认值见 `reference/api/uikit-provider.md`。
