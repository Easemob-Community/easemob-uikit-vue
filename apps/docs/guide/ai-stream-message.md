# AI 流式消息（Stream Message）

环信 IM 支持**流式消息**：内容边生成、边发送、边接收，典型场景是 AI 对话 / 实时协作 / 分段生成。

UIKit 对流式消息采用**「内核薄、插件厚」**的分层设计：

- **内核内置**（无需任何配置）：数据链路（分片合并到同一条气泡）+ 纯文本流式状态（光标 / 终态 / 异常）；
- **插件按需**：markdown 等富格式渲染（重依赖不进内核）、AI 助手集成，全部通过既有插槽扩展点接入。

> 背景参考：环信 Web SDK「接收流式消息」[官方文档](https://doc.easemob.com/document/web/message_stream_receive.html)。
> 设计与执行计划：根目录 `STREAMING-MESSAGE-PLAN.md`（对应 TECH-DEBT D95）。

## SDK 语义（先读，避免踩坑）

- **仅文本消息**支持流式（`text` 类型，不是新消息类型）；
- **客户端只接收、不发送**：流式内容由**业务服务端 RESTful 下发**，客户端 SDK 通过 `chatManager` 事件接收；
- SDK 触发 `onStreamMessage`，已按 `msgServerId` 排序合并分片；
- 消息体 `stream` 字段：

| 字段 | 含义 |
| --- | --- |
| `deltaText` | 当前分片增量文本 |
| `fullText` | 截至当前分片的累计全文（同 `body.content`） |
| `status` | `STREAM_START` / `STREAM_START_COMPLETED` / `STREAM_IN_PROGRESS` / `STREAM_COMPLETED` / `STREAM_ERROR` |
| `customType` | 业务自定义流类型，如 `'text'` / `'markdown'` |
| `errorType` / `finishReason` | 异常码 / 结束原因 |

## 内核能力（开箱即用）

UIKit 内核已内置流式消息的完整数据链路与纯文本渲染，**接入方零配置即可正确接收**：

1. **分片合并**：`onStreamMessage` 按 `msgServerId` 定位同一条 TEXT 消息，
   `body.content` 以 `stream.fullText`（服务端排序合并后的累计全文）幂等覆盖，**不产生新气泡**；
2. **丢片补偿**：离线 / 断连期间错过分片时，服务端同步到达的完整消息会自动覆盖未完成的流式副本，不会残留半截内容；
3. **纯文本流式状态**（`customType='text'` 或缺省）：传输中气泡尾部**打字机光标**，完成态收敛为普通文本，异常态追加「内容生成异常」提示；
4. **会话联动**：流式内容增长时，当前会话摘要随 `body.content` 响应式更新；消息列表在用户位于底部时自动跟随滚动；
5. **历史回流**：`loadHistory` 拉取的流式消息已是终态，按普通文本渲染，不会重复合并。

`UiMessage` 扩展了可选 `stream?` 字段（复用 SDK `StreamMessageMeta`），渲染层与插件可直接读取。

## 插件：markdown 流式气泡（推荐形态）

`customType='markdown'` 等富格式流式内容由插件通过既有 `#message-txt` 插槽接管渲染，内核无感。
Demo 提供了完整参考实现（`apps/demo/src/components/ai/demo-markdown-message.vue`），核心思路：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { EmTextMessage, STREAM_MESSAGE_STATUS } from '@easemob/uikit'
import type { UiMessage } from '@easemob/uikit'

const props = defineProps<{ message: UiMessage }>()

// 1. 仅接管 customType='markdown' 的流式消息，其余回落内核文本气泡
const isMarkdownStream = computed(() =>
  props.message.stream?.customType === 'markdown',
)

// 2. 流式状态：传输中光标 / 终态收敛 / 异常提示
const isStreaming = computed(() => {
  const status = props.message.stream?.status
  return status === STREAM_MESSAGE_STATUS.START
    || status === STREAM_MESSAGE_STATUS.IN_PROGRESS
})
const isStreamError = computed(() =>
  props.message.stream?.status === STREAM_MESSAGE_STATUS.ERROR,
)

// 3. markdown 渲染（html 关闭防 XSS；代码高亮等重依赖按需引入）
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
const renderedHtml = computed(() =>
  md.render((props.message.body as { content?: string }).content || ''),
)
</script>

<template>
  <EmTextMessage v-if="!isMarkdownStream" :message="message" />
  <div v-else class="md-msg">
    <div class="md-msg__bubble">
      <div v-html="renderedHtml" />
      <span v-if="isStreaming" class="md-msg__cursor" />
    </div>
    <div v-if="isStreamError" class="md-msg__error">内容生成异常</div>
  </div>
</template>
```

业务侧挂载（`chat.vue` 自动把所有命名插槽透传到消息渲染链）：

```vue
<em-chat-container :config="chatConfig">
  <!-- markdown 流式由插件接管；普通文本 / 纯文本流式走内核 -->
  <template #message-txt="{ message }">
    <MyMarkdownMessage :message="message" />
  </template>
</em-chat-container>
```

## AI 助手接入：三模式

AI 对话是流式消息的典型场景。接入方式有三种（Demo 已实现前两种的参考代码）：

| 模式 | 说明 | 适用 |
| --- | --- | --- |
| **Mock** | 前端内置模拟回复生成器，分片注入，开箱即用 | 文档演练、联调、体验流式效果 |
| **直连** | 前端直接调用模型 API（如 DeepSeek 的 OpenAI 兼容接口，`fetch` + SSE 流式解析） | 内部体验；**不推荐生产** |
| **业务代理** | 业务服务端封装模型调用，经环信 RESTful 下发流式消息 | **生产推荐** |

::: warning 安全提示
模型 API Key 不要放在前端。生产环境务必走**业务服务端代理**：
服务端调用模型 → 通过环信服务端 API 下发流式消息 → 客户端 `onStreamMessage` 接收。
:::

### Demo 参考实现

Demo 已内置完整的 AI 流式演示（`apps/demo`）：

- **Toolbar AI 按钮**：向当前会话注入一条 markdown 流式演示消息（代码块 / 表格 / 引用）；
- **设置 → AI 面板**：开启「AI 应答（Mock）」后，自己发送文本消息会自动触发 mock AI 的 markdown 流式回复；可手动注入异常流式消息演示异常态；
- **实现文件**：`components/ai/use-stream-demo.ts`（分片模拟器 + mock 回复生成器）、`components/ai/demo-markdown-message.vue`（markdown 气泡）。

真实接入时，把「mock 回复生成器」替换为业务服务端代理返回的流式数据即可，UI 层无需改动。

## 决策与限制

- **内核边界**：内核只做 `customType='text'`（含缺省）纯文本流式；markdown 等富格式一律走插件插槽；
- **未读 / 摘要**：流式消息按 TEXT 消息语义处理，未读计数由 SDK 会话同步驱动；摘要随内容更新自动刷新；
- **性能**：分片覆盖更新走 store 响应式，默认节奏下无压力；极端高频场景可在插件「打字机层」节流重渲染；
- **发送**：客户端不发送流式消息（SDK 语义），发送侧仍走普通文本消息；
- **文档**：`UiMessage.stream` 复用 SDK `StreamMessageMeta` 类型，不本地复刻，避免双源漂移。
