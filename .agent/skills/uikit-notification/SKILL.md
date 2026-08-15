# Vue3 UIKit 通知系统契约（useNotification / notification-engine）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-notification**。

## 触发词

- `通知` / `消息通知` / `系统通知` / `浏览器通知`
- `useNotification` / `notify` / `notifyBrowser`
- `免打扰` / `isMuted` / `triggerMode` / `background`
- `通知权限` / `Notification API` / `autoRequestPermission`
- `页内弹窗` / `右上角通知` / `EmNotificationContainer`

## 目标

UIKit 的通知链路是**三件套**：`useNotification` 单例状态机（composables）→
`notifyOnNewMessage` 判定引擎（sdk/notification-engine）→ `EmNotificationContainer` 渲染
（components）。Provider 只负责把 notification prop 翻译成单例配置。改通知行为前先认清
**判定链**与**降级链**，避免四类翻车：

1. 在事件里无条件 notify——绕过免打扰/当前会话判定；
2. 自建第二份通知状态——与单例双源漂移；
3. 页内通知不自动关闭——卡片堆积不消失；
4. 点击通知只改会话 ID——未读数 1→0 闪烁（enter + ack 才完整）。

**边界划分**：判定链 + 状态机必须留在 UIKit 内（依赖 conversationList/currentConversationId/
currentUser 内部状态）；渲染层可替换（`notification.enable: false` + `useNotification()` 自渲染）；
**铃声等自定义行为不做进内核**——通过 `onNotify` 送达回调交给业务（音频资源与浏览器
autoplay 解锁策略由业务侧负责，详见 `notification-engine` 的 `emitNotificationDelivered`）。

## 1. useNotification 单例（`composables/use-notification.ts`）

- **模块级单例**：`state` 是模块顶层 `ref`，`useNotification()` 只返回 `readonly(state)` +
  能力函数，任何组件调用都是同一份状态（与 `useToast` 同一模式）；
- `NotificationState`：`list`（页内弹窗条目）/ `enabled` / `browserEnabled` /
  `inAppEnabled` / `permission`（`'default' | 'granted' | 'denied' | 'unsupported'`）/
  `supported`（环境是否支持 Notification API）/ `triggerMode`（默认 `'background'`）；
- 关键常量：`MERGE_WINDOW_MS = 3000`（同会话合并窗口）、`IN_APP_DURATION_MS = 5000`
  （页内弹窗自动消失时长）；
- `notify(item)` 合并语义：同 conversationId 且距上条 < 3s 时**刷新内容 + unreadCount 累加**，
  不新增卡片，返回既有 ID；否则新建卡片并调度 5s 自动关闭；
- `close(id)` 必须**清对应 timer**；`closeAll()` 清全部 timer；关闭总开关 / 页内开关时清空列表；
- `configureNotification(config)` 批量应用（enabled/browserEnabled/inAppEnabled/
  autoRequestPermission/triggerMode），Provider 与业务方共用；
- `setNotificationHandler(handler)` 注册**送达回调**（`NotificationHandler`：
  `(item, channel: 'browser' | 'in-app') => void`），Provider 的 `notification.onNotify`
  走这条注册；**仅在实际投递时触发**（浏览器通知发出成功 / 页内弹窗入列），
  未投递（权限被拒且页内关闭）不触发；
- `autoRequestPermission` 是**模块级非响应式变量**，仅 `configureNotification` 可改，
  渲染层不要依赖它。

## 2. 浏览器系统通知（notifyBrowser）

```
前置条件（任一不满足返回 false）：
- browserEnabled 开启
- 环境支持 Notification（'Notification' in window）
- 权限已 granted，或 permission 仍为 'default' 且 autoRequestPermission 开启（自动弹授权框）
```

- `new Notification(title, { body, icon: avatar, tag: conversationId })`：
  **tag = conversationId**，同会话多条通知被浏览器原生合并替换；
- `onclick`：`window.focus()` + 已注册的 `clickHandler?.(item)` + `notification.close()`；
- 返回 `false` 的场景（权限被拒/不支持/异常）由**调用方降级为页内弹窗**。

## 3. 判定引擎 notifyOnNewMessage（`sdk/notification-engine.ts`）

- 调用点：`sdk/event/chat-events.ts` 的 `onMessage`（消息落库后调用），**不阻塞主流程**，
  内部静默失败；
- 触发条件（**全部满足**才通知）：
  1. 总开关 `state.enabled`；
  2. 非自己发送（`normalizeUserId(from) !== currentUser`）；
  3. 非当前打开的会话（`conversationId !== currentConversationId`，当前会话实时消息不打扰）；
  4. 会话未开启免打扰（`conversationList` 中该会话 `isMuted`）；
  5. 触发模式：`'background'`（默认）要求页面隐藏；`'always'` 不限可见性。
- 通道选择：
  - 页面隐藏 + `browserEnabled` → `notifyBrowser` 优先，`then(sent => !sent && inAppEnabled && notify(item))`
    失败降级页内弹窗；
  - 其余（页面可见或浏览器关）→ `inAppEnabled` 时直接 `notify(item)`。
- **送达回调触发点**（`emitNotificationDelivered`，与通道选择一一对应）：
  - 浏览器通知发出成功 → `emitNotificationDelivered(item, 'browser')`；
  - 页内弹窗入列（含浏览器失败降级）→ `emitNotificationDelivered(item, 'in-app')`；
  - 未投递（两通道都不可用）→ 不触发。
- 条目构造：群聊 `title` = 群名、`body` 含「发送者: 内容」前缀、`avatar` = 群头像；
  单聊 `title` = 发送者名、`avatar` = 发送者头像（走 `resolveSenderDisplayName` /
  `resolveLastMessageText` / userInfo store）。

## 4. Provider 接线（`containers/uikit-provider/uikit-provider.vue`）

- `notification` prop：`enable` / `browser` / `inApp` / `autoRequestPermission` 默认全 `true`；
  `triggerMode` 默认 `'background'`；`navigateOnClick` 默认 `true`；`onNotify` 默认不注册；
- `watch(notification, { deep: true, immediate: true })` → `configureNotification(...)` +
  `setNotificationClickHandler(navigateOnClick === false ? null : onNotificationClick)` +
  `setNotificationHandler(config?.onNotify ?? null)`，
  运行时改 prop 即刻生效；
- 默认点击行为 `onNotificationClick`：`window.focus()` → `navigateOnClick===false` 短路 →
  在会话列表找到会话 → `domains.conversation.enter(id, type)` + `sendChannelAck(id, type)`；
  必须 enter 而非只 setCurrentConversationId（SDK 层不认当前会话 → 新消息未读数先增后清，
  1→0 闪烁），详见 skill `uikit-provider-config` §7；
- `EmNotificationContainer` 在 Provider 模板内按 `notification.enable ?? true` 挂载：
  `items = notificationState.list`，`@close="closeNotification"`、`@click` 走默认点击行为。

## 5. 渲染组件（`components/notification`）

- `NotificationItem`：`id`（合并时复用）/ `title` / `body` / `avatar?` / `timestamp` /
  `conversationId` / `conversationType` / `unreadCount`（合并窗口内累计条数，>1 展示合并数）；
- `EmNotificationContainer` 是页内右上角堆叠弹窗；业务关闭内置容器后可
  `useNotification()` 取 `state.list` 自渲染（Provider 的 `notification.enable: false` 只卸载
  容器，**单例状态仍在**）。

## 硬规则 vs 软约定

**硬规则：**

- 消息通知入口必须走 `notifyOnNewMessage`（或至少完整复刻其判定链），禁止在事件处理里
  无条件 `notify()` 绕过免打扰 / 当前会话判定。
- 通知状态是**模块级单例**，禁止新建第二份 state / 自建事件总线投递通知。
- 页内通知必须可自动关闭（`notify` 自带 5s 调度），自定义渲染时 `close` 必须清 timer，
  禁止只 filter 列表留下僵尸 timer。
- 点击通知跳转必须走 `domains.conversation.enter` + `sendChannelAck`（与 Provider 默认一致）。
- `notifyBrowser` 失败必须降级页内弹窗，禁止静默丢弃消息提示。
- 送达回调（`onNotify` / `setNotificationHandler`）只能由引擎在**实际投递点**触发一次，
  channel 为实际通道；铃声等自定义行为在回调里实现，判定链禁止外置到业务侧。

**软约定：**

- 新增通知入口（如群公告、系统消息）复用判定引擎的通道选择逻辑（hidden → browser →
  降级 inApp），不要另写一套。
- 通知文案复用 `resolveLastMessageText` / `resolveSenderDisplayName`，保持与会话列表摘要一致。
- 自定义通知渲染保持 MERGE_WINDOW_MS 合并语义，避免同一会话短时间刷屏。

## 已知漂移（改到相关文件时注意）

- `autoRequestPermission` 不是响应式状态（模块级 let），运行时改 prop 只影响**后续**请求，
  已有 pending 授权框不受影响——不要为它加 watch。
- 通知点击 `window.focus()` 在前、`navigateOnClick` 判定在后：`navigateOnClick: false` 时
  仍会聚焦页面（这是预期，「不跳转但聚焦」）。
- `chat-events` 的 onMessage 里通知调用在消息落库与 @我 处理之后，不要把它提前到
  adapter 转换之前（需要 `uiMsg` 构造条目）。

## 反面清单

- ❌ 事件回调里直接 `notify({...})`——绕过免打扰与当前会话判定，后台/当前会话都弹窗。
- ❌ 组件里 `const myList = ref([])` 自己维护通知列表——与单例双源，容器渲染不到。
- ❌ 页内通知手动 `close` 不清 timer——5s 后 timer 再触发 close 幂等但泄漏定时器。
- ❌ 点击通知只 `setCurrentConversationId`——SDK 未读数 1→0 闪烁。
- ❌ `notifyBrowser` 返回 false 后不降级——权限被拒时消息提示彻底丢失。
- ❌ 关闭 `notification.enable` 后以为状态也清了——单例状态仍在，只是容器卸载。
