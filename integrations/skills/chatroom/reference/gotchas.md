# 高频坑与硬规则（gotchas）

## 集成类

- **必须显式安装 peer 依赖**：`pnpm add @easemob/uikit-chatroom pinia vue`；
  `useChatroomProvider()` 内部注入 pinia，不要求 `app.use(createPinia())` 顺序（已自带）。
- **无 Provider 组件**：不要找 `<EmChatroomProvider>`——入口是 `useChatroomProvider()` 组合式函数。
- **组件不注册全局**：具名导出按需 import（`EmChatroomContainer` 等），
  若要用模板 kebab 形式需自行局部注册。
- **样式已内置**：无需再 `import '@easemob/uikit-chatroom/...css'`；
  主题定制走 core CSS 变量或 `scene.themeOverrides`。

## 进房 / 换房

- **join 去重与竞态**：快速切换房间时，旧房 join 响应晚于新房 join 会被丢弃（组件已处理），
  业务不要依赖旧房回调做 UI 状态。
- **`auto-join` 关闭时仅渲染外壳**：`roomId` 变化不会自动进房，需业务手动 join。
- **断线重连自动重进**：连接恢复后容器自动重进房间，业务无需处理；
  信令房失败退避重试（`autoRejoin` 可关）。

## 消息

- **发送侧有频率限制（SDK 节流）**：触发节流时输入框必须给出明确反馈
  （禁用态 / 提示 + 恢复时机），不能静默失败。
- **大房间刷屏**：容器消息列表封顶（`maxMessages`，默认 200），
  直播场景建议 `messageArea` 限高 + 透明叠画面，或 `#message-list` 整块替换成弹幕流。
- **接收侧渲染节流**：弹幕流接收侧有缓冲队列 + 按帧批量 append（组件内置），
  与 SDK 发送侧限流是两个层面。

## 弹幕

- **`#item` 插槽接管全部 kind**：提供后无内置回退，需在插槽内自行分支。
- **自定义 kind 必须显式分区**：业务 kind 不进 `NOTIFICATION_KINDS` / `CHAT_KINDS`，
  用条目级 `zone: 'notice' | 'chat'` 指定，否则按默认回落。
- **无消费者不丢消息**：headless 订阅是增量有序 + flush 批量消费，
  业务必须在 flush 前消费或自行丢弃中间帧（UIKit 不替业务决定丢帧）。

## 信令房（多房间）

- **UI 房与信令房是两条独立时序流**：跨房消息**无全序保证**，业务不得按全序消费
  （商品指令与弹幕之间无先后保证）。
- **信令房失败不拖累 UI 房**：join 失败 / 被踢 / 解散降级为 `signal-status` 回调。
- **信令房 `pullHistory` 默认 false**：语义是订阅实时指令，历史回放由业务自调 API。

## 弹层 / 定位

- **嵌套容器场景（iframe / 手机壳 / 局部挂载）**：弹层默认 teleport 到 body，
  位置可能错位——用 `setChatroomPopupTarget('#shell')` 指定目标容器。

## 被踢 / 解散

- 监听容器 `@kicked` / `@destroyed` 事件或 `chatroomCallbacks` 回调；
  容器内会显示终态视图（可 `#terminal` 插槽覆盖）。
