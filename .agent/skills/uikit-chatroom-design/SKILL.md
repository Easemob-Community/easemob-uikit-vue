# uikit-chatroom 设计约束与组件分层

## 触发词

- `chatroom 设计` / `聊天室设计约束`
- `live 组件分层` / `直播组件抽象`
- `通用组件放哪` / `InteractiveCard` / `OverlayManager`
- `商品卡/红包/优惠券` / `直播间 overlay`

## 目标

在 `@easemob/uikit-chatroom` 场景包里做直播/语聊房/教室等变种时，
**把「通用容器/壳子」和「业务形态」分开**，避免为每一种业务卡片（商品卡、红包、优惠券、PK 条）单独预埋组件。

## 1. 核心原则：UIKIT 只提供「壳子」，业务提供「内容」

直播间里常见的商品卡、红包、优惠券、全站广播、PK 条，**本质都是可交互的浮动通知**。
UIKIT 不应该为每一种形态写一个组件，而是提供两类通用壳子：

| 壳子 | 职责 | 典型业务内容 |
|---|---|---|
| `ChatroomLiveInteractiveCard` | 浮动卡片容器：圆角边框、呼吸灯 active 态、关闭动画、已抢光/已领完遮罩、点击/关闭/行动事件、倒计时自动关闭 | 商品卡、红包卡、优惠券、榜单通知 |
| `ChatroomLiveOverlayManager` | 多卡片布局管理：按 `top` / `bottom-right` 等锚点自动堆叠，避免重叠 | 右下商品卡 + 红包卡同时弹出时的自动排位 |
| `ChatroomLiveFullscreenEffect` | 全屏动效容器：全屏 overlay、入场/退场动画、自动移除 | 火箭/跑车大礼物、全屏公告、PK 胜利 |
| `ChatroomLiveDanmakuStream` | 弹幕/通知流：上部固定通知区 + 下部滚动聊天区 | 普通弹幕、礼物、购买提示、欢迎进入、商品上架通知 |

业务方通过 **插槽** 往壳子里放自己的 UI 和数据协议。

## 2. 组件分层

```
packages/uikit-chatroom/src
├── components/          # 纯展示/通用工具组件（如 virtual-list）
├── modules/chatroom/
│   ├── common/          # 跨场景通用业务块（header、input-bar、message-item 等）
│   ├── live/            # 直播场景业务块
│   │   ├── chatroom-live-interactive-card.vue   # 通用交互卡片壳子
│   │   ├── chatroom-live-overlay-manager.vue    # 通用 overlay 布局管理器
│   │   ├── chatroom-live-danmaku-stream.vue     # 通用弹幕/通知流
│   │   ├── chatroom-live-top-bar.vue            # 直播间顶部栏
│   │   ├── chatroom-live-input-bar.vue          # 直播间底部输入区
│   │   └── ...
│   └── voice/           # 语聊房场景业务块
└── containers/          # 页面容器（EmChatroomContainer）
```

规则：
- 新加一个「业务形态组件」（如 `coupon-card.vue`）前，先问自己：它是不是 `InteractiveCard` 里换一套 slot 就能实现？如果是，**不允许新增组件**。
- 只有确实需要新的交互范式（如全屏礼物特效、连麦窗口）时，才允许新增 live 模块组件。

## 3. 属性 key 契约

聊天室房间属性（attributes）是变种间共享的 KV 空间，必须使用场景前缀防冲突：

```ts
import { CHATROOM_ATTR_PREFIX, useChatroomAttributes } from '@easemob/uikit-chatroom'

const { prefixedKey, setAttributes, removeAttributes } = useChatroomAttributes()

// ✅ 正确：带 live_ 前缀
const productKey = prefixedKey(CHATROOM_ATTR_PREFIX.LIVE, 'product')
setAttributes({ [productKey]: JSON.stringify(product) })

// ✅ 多商品场景业务方自己加 id
const productKey2 = prefixedKey(CHATROOM_ATTR_PREFIX.LIVE, `product_${productId}`)
```

**硬规则**：
- 禁止在 UIKIT 内部写死具体业务 key（如 `live_product`）；
- UIKIT 只导出 `CHATROOM_ATTR_PREFIX` 和 `prefixedKey` 工具；
- 删除属性必须用 `removeAttributes`，不能用 `setAttributes({ key: '' })` 或 `null`（SDK 不允许空值）。

## 4. 弹幕消息类型契约

通用弹幕类型已抽到 `live-danmaku-types.ts`：

```ts
type LiveDanmakuKind = 'normal' | 'checkin' | 'purchase' | 'gift' | 'welcome'
```

视觉分区由常量决定，业务方 push 时只决定语义 kind：

```ts
import { NOTIFICATION_KINDS, CHAT_KINDS } from '@easemob/uikit-chatroom'
```

- `NOTIFICATION_KINDS`：固定在上部通知区（商品上架、购买提示、欢迎进入）
- `CHAT_KINDS`：自动滚动聊天区（普通弹幕、礼物）

新增 kind 时，必须同步更新 `NOTIFICATION_KINDS` / `CHAT_KINDS` 和 `KIND_PRIORITY`。

## 5. 全屏动效也是「容器壳子」

大礼物（火箭/跑车/飞机）、全屏公告、PK 胜利等强提示效果，由 `ChatroomLiveFullscreenEffect` 统一承载：

- UIKIT 提供：全屏 overlay、入场/退场动画、自动移除、队列消费；
- 业务方通过 slot 自定义：emoji/SVG/Lottie、文案、背景、音效触发；
- 同一份壳子可复用于礼物动效、全站广播、活动公告。

## 6. 输入条也是「容器壳子」

`ChatroomLiveInputBar` 不是为某一种直播间形态写的，而是通用输入容器：

- UIKIT 提供：文本输入、Enter 发送、快捷短语、最大长度、发送节流、敏感词拦截、
  发送前自定义校验、乐观发送模式、底部安全区适配；
- 业务方通过插槽自定义：右侧动作按钮（礼物/菜单/分享/点赞/发送）、底部弹层面板；
- 不同场景（直播/语聊房/教室）复用同一个组件，只换动作组合。

配置能力（props）：

| 配置 | 说明 |
|---|---|
| `quickPhrases` / `showQuickPhrases` | 快捷短语 |
| `maxLength` | 最大输入长度 |
| `sendIntervalMs` | 发送最小间隔，触发 `send-too-fast` |
| `blockWords` | 客户端拦截词库，触发 `block` |
| `beforeSend` | 自定义校验钩子 |
| `optimistic` | 乐观模式：跳过客户端所有检查直接 emit send，由服务端/业务兜底 |
| `disabled` / `disabledHint` | 禁用与提示 |

插槽：

- `#quick-phrases`：覆盖默认快捷短语行；
- `#actions`：右侧动作区，scope 暴露 `text` / `send` / `canSend`；
- `#panels`：底部弹层面板（礼物面板、表情面板等）。

## 6. 扩展示例：业务方加一种「优惠券卡」

不需要改 UIKIT，Demo/业务代码里这样写：

```vue
<ChatroomLiveOverlayManager :items="overlayItems" @remove="handleRemove">
  <template #item="{ item, close }">
    <ChatroomLiveInteractiveCard
      v-if="item.meta?.type === 'coupon'"
      :active="true"
      :auto-close-ms="15000"
      @close="close"
      @action="useCoupon(item.meta.id)"
    >
      <template #title>
        <span class="coupon-tag">限时券</span>
      </template>
      <div class="coupon-body">
        ¥{{ item.meta.amount }}
      </div>
      <template #footer>
        <button @click.stop="useCoupon(item.meta.id)">立即使用</button>
      </template>
    </ChatroomLiveInteractiveCard>
  </template>
</ChatroomLiveOverlayManager>
```

## 7. 反面清单

- ❌ 为商品卡、红包卡、优惠券各写一个 UIKIT 组件；
- ❌ 在 UIKIT 内部写死 `live_product` / `live_redEnvelope` 等业务属性 key；
- ❌ 关闭卡片时用 `setAttributes({ key: '' })` 或 `null`；
- ❌ 弹幕业务代码里硬编码 `kind` 字符串，不引用 `NOTIFICATION_KINDS` / `CHAT_KINDS`；
- ❌ 新组件不先判断是否可用现有 `InteractiveCard` / `OverlayManager` / `DanmakuStream` 组合实现。
