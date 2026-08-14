<script setup lang="ts">
/**
 * 设置面板 - AI（流式消息演示）
 *
 * 提供 UIKit 流式消息能力的开箱即用演示：
 * - AI 应答（mock）：开启后自己发送文本消息，自动注入 mock AI markdown 流式回复；
 * - 手动注入演示：markdown 流式（代码块/表格/引用）与异常流式（异常态提示）。
 * 真实接入请走业务服务端代理（见文档「AI 流式消息」章节）。
 */
import { useUIKit } from '@easemob/uikit'
import {
  runMarkdownStreamDemo,
  runMarkdownStreamErrorDemo,
} from '../ai/use-stream-demo'
import { useDemoSettings } from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const { aiMockReplyEnabled, toggleAiMockReply } = useDemoSettings()
const { stores } = useUIKit()

/** 当前会话（无会话时演示按钮禁用） */
const currentConversation = () => stores.conversation.currentConversation

/** 在当前会话注入 markdown 流式演示消息 */
function injectMarkdownDemo() {
  const cvs = currentConversation()
  if (!cvs)
    return
  runMarkdownStreamDemo(stores.message, {
    conversationId: cvs.id,
    conversationType: cvs.type,
    to: stores.client.currentUser || '',
  })
}

/** 在当前会话注入异常流式演示消息 */
function injectErrorDemo() {
  const cvs = currentConversation()
  if (!cvs)
    return
  runMarkdownStreamErrorDemo(stores.message, {
    conversationId: cvs.id,
    conversationType: cvs.type,
    to: stores.client.currentUser || '',
  })
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="AI 应答（Mock 流式）"
        tip="开启后自己发送文本消息，自动触发 mock AI 的 markdown 流式回复（打字机效果）"
      />
      <button
        class="demo-btn"
        :class="{ 'demo-btn--active': aiMockReplyEnabled }"
        @click="toggleAiMockReply(!aiMockReplyEnabled)"
      >
        {{ aiMockReplyEnabled ? '已开启 AI 应答' : '开启 AI 应答' }}
      </button>
      <div class="demo-info">
        发送任意文本消息，约 0.7s 后 AI 助手（ai_assistant）开始分片回复：<br>
        传输中尾部打字机光标 → 终态收敛为完整 markdown 内容。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="手动注入流式演示"
        tip="向当前会话注入一条 mock 流式消息，演示内核合并链路与插件 markdown 渲染"
      />
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <button class="demo-btn" :disabled="!currentConversation()" @click="injectMarkdownDemo">
          注入 markdown 流式消息
        </button>
        <button class="demo-btn" :disabled="!currentConversation()" @click="injectErrorDemo">
          注入异常流式消息
        </button>
      </div>
      <div class="demo-info">
        需要先选中一个会话（当前会话为空时按钮置灰）。<br>
        异常流式演示：前两行正常生成后以 <code>STREAM_ERROR</code> 结束，气泡尾部提示「内容生成异常」。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="接入说明"
        tip="内核薄、插件厚：数据链路内置，markdown 渲染由插件插槽接管"
      />
      <div class="demo-info">
        流式消息仅文本类型、客户端只收不发，由业务服务端 RESTful 下发；<br>
        内核通过 <code>onStreamMessage</code> 按 <code>msgServerId</code> 合并分片到同一条气泡，<br>
        纯文本流式（光标/终态/异常）内核内置；markdown 由 <code>#message-txt</code> 插槽接管渲染。<br>
        生产接入建议走业务服务端代理，避免前端直调模型 API Key。详见文档「AI 流式消息」章节。
      </div>
    </div>
  </div>
</template>
