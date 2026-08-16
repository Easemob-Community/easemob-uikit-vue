# ChatroomLiveInputBar 直播间输入条

直播间输入条通用壳子：UIKIT 负责文本输入、Enter 发送、快捷短语、发送节流、敏感词拦截、
最大长度限制、禁用状态与底部安全区适配；业务方通过插槽自定义右侧动作按钮与底部弹层面板。

## 使用方式

组件以 `ChatroomLiveInputBar` 为名导出（具名导出，按需 import），可脱离容器独立使用：

```vue
<script setup lang="ts">
import { ChatroomLiveInputBar } from '@easemob/uikit-chatroom'

function sendText(text: string) { /* 发送（useChatroomMessage().sendText） */ }
</script>

<template>
  <ChatroomLiveInputBar
    :quick-phrases="['666', '主播好棒']"
    :send-interval-ms="800"
    :block-words="['脏话']"
    @send="sendText"
  >
    <!-- 右侧动作区：礼物 / 菜单 / 分享 / 点赞 -->
    <template #actions="{ text, send, canSend }">
      <button :disabled="!canSend" @click="send()">🎁 礼物</button>
    </template>
  </ChatroomLiveInputBar>
</template>
```

## 运行示例

<demo src="./demo/live-input-bar.vue" title="直播间输入条" desc="输入回车发送（回显演示）、快捷短语、敏感词拦截与 `#actions` 动作插槽。纯 UI 演示，无需登录。" />

## API

::: v-pre
<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-input-bar.md -->
:::

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#quick-phrases` | `{ phrases, send }` | 快捷短语区整块覆盖（内置短语按钮 → 自定义布局） |
| `#actions` | `{ text, send, can-send }` | 输入框右侧动作区（礼物 / 菜单 / 分享 / 点赞） |
| `#panels` | — | 底部弹层面板区（礼物面板 / 表情面板等，显示逻辑业务自理） |

## 敏感词拦截

直播间公开广播，刷屏 / 脏话治理是上线刚需。按「**四层分界**」各归其位
（详见仓库根 [SENSITIVE-WORD-FILTER-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/SENSITIVE-WORD-FILTER-DESIGN.md)）：

```
词库层（内容）  → 业务方：词库从哪来、如何更新、内容合规责任（UIKit 绝不内置词表）
策略层（决策）  → 业务方：拦截 or 替换 or 仅提示、服务端联动、谐音对抗策略
接线层（管线）  → UIKit：发送拦截点、接收过滤/脱敏点、命中事件出口
算法层（引擎）  → UIKit(core)：AC 状态机、字符归一化（设计中，D102）
```

**当前能力（发送侧拦截）**：客户端第一道防线（服务端审核仍须兜底——客户端拦截
可被绕过，只是体验层）。命中即禁止发送 + 输入条内提示，不进入消息链路：

::: v-pre
```vue
<ChatroomLiveInputBar
  :block-words="['脏话', '广告', '代购']"
  block-hint="包含敏感词 {{word}}，请修改后重试"
  @block="(text, reason) => myToast.warning(reason)"
  @send="sendText"
/>
```
:::

- **注入方式**：`block-words` prop 传入词库（大小写不敏感），`block-hint` 自定义提示
  （`word` 为命中词占位），命中派发 `block` 事件（业务可上报服务端二次审核）；
- **乐观模式**：`optimistic` 为 true 时跳过客户端拦截 / 节流 / 敏感词检查，直接 emit send，
  由业务 / 服务端兜底（适合已做服务端审核的场景）；
- **设计方向（D102，尚未实施）**：core 引入 AC 自动机引擎（大词库 O(n) 匹配 + 字符归一化
  对抗），容器新增 `sensitive-words` 透传与接收侧 `filter / mask` 策略 + `sensitive-hit`
  审计事件——当前线性扫描在词库 < 500 词时完全够用，升级对现有用法零破坏。

## 相关文档

- [ChatroomLiveTopBar 直播顶部栏](./live-top-bar)
- [ChatroomGiftBar 礼物入口](./gift-bar)
- [ChatroomContainer 聊天室容器](./chatroom-container)
