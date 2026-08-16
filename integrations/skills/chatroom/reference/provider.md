# Provider 配置（useChatroomProvider）

聊天室**不引入新的 Provider 组件**：`useChatroomProvider()` 是组合式入口，
内部注入 pinia 并初始化 client，返回聊天室上下文（房间注册表、消息桶、成员、属性等）。

## 选项

```ts
interface UseChatroomProviderOptions {
  /** 环信 AppKey（格式 orgName#appName）；传入即自动初始化 */
  appKey?: string
  /** 登录令牌（userId + token 或自动登录配置，同 core useClient） */
  userId?: string
  token?: string
  /** 房间终态回调（被踢 / 解散），容器与 headless 均会触发 */
  chatroomCallbacks?: ChatroomEventCallbacks
  /** 消息 ext 用户信息配置（昵称 / 头像下沉消息 ext，免 userInfo 查询） */
  messageUserInfo?: MessageUserInfoConfig
  // 其余选项继承 core 的 useClient 配置（autoInit / theme / locale / logger 等）
}
```

## 登录两种方式

```ts
// 1) 声明式：传 appKey（+ userId/token），自动初始化
useChatroomProvider({ appKey: 'org#app', userId: 'u1', token: '...' })

// 2) 手动：先 useChatroomProvider({ appKey })，再 useClient().login()
const { login } = useClient()
await login({ userId: 'u1', token: '...' })
```

## 房间终态回调（被踢 / 解散）

```ts
useChatroomProvider({
  appKey,
  chatroomCallbacks: {
    onKicked: (roomId, reason) => { /* toast + 退出态 */ },
    onDestroyed: (roomId) => { /* 房间解散处理 */ },
  },
})
```

容器内被踢 / 解散会显示终态视图（可 `#terminal` 插槽覆盖）并派发 `kicked` / `destroyed` 事件。

## 消息用户信息（昵称 / 头像下沉 ext）

大房间免 `userInfo` 查询：发送时把昵称 / 头像写进消息 ext，渲染直接读取：

```ts
useChatroomProvider({
  appKey,
  messageUserInfo: { nicknameKey: 'nick', avatarKey: 'avatar' },
})
// 或运行时动态配置
import { setChatroomMessageUserInfoConfig } from '@easemob/uikit-chatroom'
setChatroomMessageUserInfoConfig({ nicknameKey: 'nick', avatarKey: 'avatar' })
```

## 弹层 Teleport 目标

嵌套容器场景（如 demo 手机壳）弹层默认挂 body，可全局改目标：

```ts
import { setChatroomPopupTarget } from '@easemob/uikit-chatroom'
setChatroomPopupTarget('#my-shell')
```

## 信令房（多房间订阅）

`signalRooms` 在容器 prop 上配置（不是 provider）：1 个 UI 房 + N 个信令房，
信令房消息零渲染零假设，经 `signal-message` 事件透传、`signal-status` 透传状态：

```vue
<EmChatroomContainer
  room-id="ui-room"
  :signal-rooms="[{ roomId: 'signal-room-a' }]"
  @signal-message="onSignal"
  @signal-status="onSignalStatus"
/>
```

注意：信令房 join 失败 / 被踢 / 解散**不拖累 UI 房**（降级为 status 回调）。
