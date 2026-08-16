# headless 接入（无 UI 数据层）

弹幕轨道、飘屏、礼物特效是直播间的**强差异化 UI**——业务往往要自绘。
聊天室 UIKit 把「连接 + 房间 + 消息流 + 发送 + 成员 + 属性」的**全部数据能力**
开放为组合式函数，**不渲染任何 UI 即是一等公民**：headless 与容器共用同一套
store/composable 内核，不存在「第二 API 面」。

## 能力全景

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 连接与初始化 | `useChatroomProvider` | 注入 pinia、初始化 SDK client、房间终态回调（被踢/解散） |
| 房间生命周期 | `useChatroom` | 进房 / 退房 / 状态机 / join 竞态 / 断线自动重进（按注册表全量） |
| 消息订阅 | `useChatroomMessage().subscribe` | **增量有序 + flush 批量消费**（见下「契约」） |
| 消息发送 | `useChatroomMessage().sendText / sendImage / sendCustom` | 乐观上屏、发送节流反馈、按 `roomId` 发信令房 |
| 历史消息 | `useChatroomMessage().loadMoreHistory` | 向上翻页 |
| 成员管理 | `useChatroomMember` | 成员分页 / 禁言 / 踢人 / 黑名单 / `canManageMember` |
| 房间属性 | `useChatroomAttributes` | KV 四层同步（本地乐观 → set → 事件 → 拉取兜底），全房间实时可见 |
| 消息用户信息 | `useChatroomMessageUserInfo` | 消息 ext 昵称 / 头像下沉，免 userInfo 查询 |
| 多房间 | `signalRooms` / 显式 `roomId` | 1 个 UI 房 + N 个信令房并行，消息零渲染透传 |
| 底层数据 | `useChatroomStore` / `useChatroomMessageStore` | 房间注册表 / 消息桶（高级用法，见 [数据层](./stores)） |

## 消息订阅契约（关键）

```ts
const { subscribe } = useChatroomMessage()

const off = subscribe((messages) => {
  // messages = 本帧增量（有序），UI 按帧批量追加到自己的轨道
  renderLane(messages)
})
```

- **增量有序**：回调按房间内消息顺序给出，无乱序；
- **批量消费**：接收侧按帧 flush，业务一次拿到一批（帧间合并，渲染友好）；
- **无消费者不丢消息**：UIKit 不替业务决定丢帧——轨道封顶 / 丢弃中间帧由业务自行决定；
- **与渲染解耦**：订阅独立于容器渲染列表，容器内 trim 封顶不影响订阅者；
- **发送限流反馈程序化**：SDK 发送节流触发时经回调 / 消息状态（failed）暴露，无输入框也能提示。

## 完整示例：自绘弹幕轨道

```ts
import { useChatroom, useChatroomMessage } from '@easemob/uikit-chatroom'

// 1) 初始化（App 级一次）
useChatroomProvider({ appKey: 'orgName#appName' })

// 2) 页面内：进房 + 订阅
const { join, leave } = useChatroom()
const { subscribe, sendText } = useChatroomMessage()

await join('room123')                    // 进房自动拉历史 + 订阅消息流

subscribe((batch) => {
  // 3) 按帧批量渲染到自绘轨道（节流 / 丢帧业务自己决定）
  myDanmakuRenderer.append(batch)
})

// 4) 发送（输入框 / 快捷短语自绘）
sendText('666')

// 5) 离开页面时退房
onUnmounted(() => leave())
```

## 在线演示：headless 弹幕轨道

<demo src="./demo/headless-danmaku.vue" title="headless 弹幕轨道" desc="无容器自绘：模拟消息源按帧批量回调（对应 subscribe 契约），UI 完全自绘。真实接入时替换为 useChatroom + useChatroomMessage 即可。" />

## 各场景中 headless 承担的角色

| 场景 | headless 提供 | 业务自绘 |
| --- | --- | --- |
| 直播间弹幕 | 消息流（增量有序 + 批量）、发送、限流反馈 | 弹幕轨道 / 飘屏 / 进场动画 |
| 礼物特效 | 礼物消息协议（`CHATROOM_GIFT_EVENT`）、发送 | 全屏动效 / 队列消费 |
| 语聊房麦位 | 房间属性 KV（`voice:micQueue` 四层同步） | 麦位 UI / 上麦下麦交互 |
| 私域直播信令 | `signal-rooms` 静默订阅 + 按房发送 | 商品指令解析 / 信令状态机 |
| 客服 / 运营工作台 | 多房间并行 + 成员管理 + 禁言 | 工作台界面（非 H5 形态） |
| 数据 / 质检 | 房间 + 消息流 + 成员事件 | 统计落库 / 报表 |

## 容器 vs headless（怎么选）

- **要完整房间页面**（历史 / 消息 / 成员面板 / 输入条 / 系统通知开箱即用）→
  `EmChatroomContainer`，用场景预设 + 插槽覆盖变种；
- **要自定义渲染形态**（自绘弹幕 / 悬浮球 / 工作台）→ headless composables，
  数据能力一致，UI 全权自管；
- **混合**：容器内 `#message-list` 插槽把消息区换成自绘轨道 = 容器 + headless 消费并存。

## 相关文档

- [数据层：stores 与 composables](./stores)（底层数据结构）
- [直播弹幕流](../components/live-danmaku)（容器内弹幕组件）
- [权限模型与业务角色](./permissions-roles)（成员管理权限口径）
- [快速开始](./quickstart)（三步接入）
