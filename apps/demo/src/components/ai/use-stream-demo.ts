/**
 * Demo 参考实现 —— 流式消息模拟器（mock 数据注入，不走真实 SDK onStreamMessage）。
 *
 * 用途：
 * 1. 演示内核流式链路（M1 store 覆盖更新 + M2 纯文本流式渲染 + markdown 插件气泡）；
 * 2. Mock AI 助手：发送文本消息后自动注入一条 markdown 流式回复，模拟端到端 AI 对话。
 *
 * 说明：真实环境由 SDK `onStreamMessage` 事件驱动（chat-events 已按 msgServerId 合并），
 * 本模拟器只向 messageStore 注入分片，完整走 store 响应式更新链路。
 */
import {
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  STREAM_MESSAGE_STATUS,
} from '@easemob/uikit-im'
import type { ConversationTypeValue, UiMessage } from '@easemob/uikit-im'

/** Mock AI 助手身份 */
export const AI_ASSISTANT_ID = 'ai_assistant'
export const AI_ASSISTANT_NICKNAME = 'AI 助手'

/** 注入 / 更新消息所需的 message store 方法子集（由调用方传入，便于测试与解耦） */
export interface StreamMessageStore {
  addMessage: (msg: UiMessage) => void
  updateMessageById: (msgId: string, patch: Partial<UiMessage>) => void
  getMessages: (conversationId: string) => UiMessage[]
}

export interface StreamSimulationOptions {
  conversationId: string
  conversationType: ConversationTypeValue
  /** 流式消息发送者，默认 AI 助手 */
  from?: string
  /** 接收方用户 ID（当前用户） */
  to: string
  /** 业务自定义流类型：text（内核纯文本）| markdown（插件渲染） */
  customType?: 'text' | 'markdown'
  /** 完整文本内容 */
  content: string
  /** 分片粒度：按字符数切分，默认 8 */
  chunkSize?: number
  /** 分片间隔 ms，默认 90（打字机节奏） */
  intervalMs?: number
  /** 结束状态：completed（默认）| error（演示异常态） */
  endStatus?: 'completed' | 'error'
}

/**
 * 向 store 注入一条流式消息并模拟分片到达。
 * 返回取消函数（可中断模拟）。
 */
export function simulateStreamMessage(
  store: StreamMessageStore,
  options: StreamSimulationOptions,
): () => void {
  const {
    conversationId,
    conversationType,
    from = AI_ASSISTANT_ID,
    to,
    customType = 'markdown',
    content,
    chunkSize = 8,
    intervalMs = 90,
    endStatus = 'completed',
  } = options

  // 按字符切分（中文按字符即可，无需分词）
  const chunks: string[] = []
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize))
  }
  if (chunks.length === 0)
    chunks.push('')

  const localId = `mock_stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let seq = 0
  let fullText = ''

  const baseMsg: UiMessage = {
    type: MESSAGE_TYPE.TEXT,
    msgServerId: '',
    msgLocalId: localId,
    from,
    to,
    sender: { userId: from, nickname: from === AI_ASSISTANT_ID ? AI_ASSISTANT_NICKNAME : undefined },
    conversationId,
    conversationType,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {
      // 发送者昵称快照：会话摘要 / 气泡发送者名解析兜底
      ease_chat_uikit_user_info: { nickname: from === AI_ASSISTANT_ID ? AI_ASSISTANT_NICKNAME : '' },
    },
    timestamp: Date.now(),
    body: { content: '' },
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
    stream: {
      customType,
      seq: 0,
      status: STREAM_MESSAGE_STATUS.START,
      deltaText: '',
      fullText: '',
      errorType: 0,
    },
  }
  store.addMessage(baseMsg)

  const timer = window.setInterval(() => {
    const isLast = seq >= chunks.length - 1
    fullText += chunks[seq] ?? ''
    const status = isLast
      ? (endStatus === 'error' ? STREAM_MESSAGE_STATUS.ERROR : STREAM_MESSAGE_STATUS.COMPLETED)
      : STREAM_MESSAGE_STATUS.IN_PROGRESS

    store.updateMessageById(localId, {
      body: { content: fullText },
      stream: {
        customType,
        seq,
        status,
        deltaText: chunks[seq] ?? '',
        fullText,
        errorType: endStatus === 'error' ? 1 : 0,
      },
    })

    seq += 1
    if (isLast) {
      window.clearInterval(timer)
    }
  }, intervalMs)

  return () => window.clearInterval(timer)
}

/** 演示用 markdown 内容：覆盖代码块 / 表格 / 引用 / 列表等常用语法 */
export const markdownStreamDemoContent = `# 流式消息演示

这是 **Markdown 流式消息** 的 Demo 演示（\`customType='markdown'\`），内容由 mock 分片驱动，逐段渲染。

## 代码块

\`\`\`ts
// 分片按 msgServerId 合并，body.content 以 fullText 幂等覆盖
function mergeStream(prev: string, delta: string): string {
  return prev + delta
}
\`\`\`

## 表格

| 状态 | 语义 | 渲染 |
| --- | --- | --- |
| 传输中 | START / IN_PROGRESS | 尾部光标 |
| 终态 | COMPLETED | 收敛为普通内容 |
| 异常 | ERROR | 异常提示 |

## 引用与列表

> 内核只内置数据链路与纯文本流式状态，markdown 渲染走插件插槽。

- [x] M1 数据链路
- [x] M2 纯文本流式渲染
- [ ] M3 markdown 插件验证（当前）
`

/**
 * 在指定会话注入一条 markdown 流式演示消息（含代码块 / 表格 / 引用 / 列表）。
 */
export function runMarkdownStreamDemo(store: StreamMessageStore, options: Pick<StreamSimulationOptions, 'conversationId' | 'conversationType' | 'to'>): () => void {
  return simulateStreamMessage(store, {
    ...options,
    customType: 'markdown',
    content: markdownStreamDemoContent,
    intervalMs: 60,
  })
}

/**
 * 在指定会话注入一条异常结束的 markdown 流式演示消息（演示异常态提示）。
 */
export function runMarkdownStreamErrorDemo(store: StreamMessageStore, options: Pick<StreamSimulationOptions, 'conversationId' | 'conversationType' | 'to'>): () => void {
  return simulateStreamMessage(store, {
    ...options,
    customType: 'markdown',
    content: '前两行正常生成，随后服务端流式处理中断……',
    chunkSize: 6,
    intervalMs: 80,
    endStatus: 'error',
  })
}

/**
 * Mock AI 回复生成器：根据提问关键词返回预设 markdown 模板。
 * 真实接入时替换为业务服务端 / DeepSeek 等模型的流式返回。
 */
export function getMockAiReply(question: string): string {
  const q = question.trim().toLowerCase()

  if (q.includes('代码') || q.includes('函数') || q.includes('demo') || q.includes('示例')) {
    return `好的，这是一个 **Vue 3** 示例：

\`\`\`vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    点击了 {{ count }} 次
  </button>
</template>
\`\`\`

> 提示：流式消息由服务端 RESTful 下发，客户端只接收、不发送。

| 能力 | 内核 | 插件 |
| --- | --- | --- |
| 数据链路 | ✅ 内置 | — |
| 纯文本光标 | ✅ 内置 | — |
| Markdown 渲染 | — | ✅ 接管 |

需要我展开哪一部分？`
  }

  if (q.includes('表格') || q.includes('对比')) {
    return `这里用**表格**对比两种接入方式：

| 方式 | 依赖 | 适用 |
| --- | --- | --- |
| 内核纯文本流 | 无 | 默认场景 |
| 插件 Markdown 流 | markdown-it 等 | AI 对话 / 富内容 |

**推荐**：内核能力 + 插件按需增强，控制核心包体积。`
  }

  return `收到你的消息：**${question.trim() || '（空）'}**

我是一段 **Mock AI 流式回复**，用于演示 UIKit 的流式消息链路：

1. 分片按 \`msgServerId\` 合并，不产生新气泡
2. 传输中尾部显示打字机光标
3. 终态后收敛为完整内容，异常时提示生成失败

> 生产接入请走**业务服务端代理**，避免前端直调模型 API Key。

你可以试试问我「代码」或「表格」，会得到不同的预设回复。`
}
