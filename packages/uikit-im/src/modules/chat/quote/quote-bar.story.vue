<script setup lang="ts">
import { ref } from 'vue'
import QuoteBar from './quote-bar.vue'

const logs = ref<string[]>([])

function log(event: string) {
  logs.value.unshift(event)
}

const textMessage = {
  id: 'msg_text',
  from: '张三',
  type: 'text',
  body: { type: 'txt', content: '明天下午三点开会，记得带上方案文档' },
} as any

const imageMessage = {
  id: 'msg_img',
  from: '李四',
  type: 'image',
  body: { type: 'img', originalImageUrl: 'https://picsum.photos/300/200' },
} as any

const imageNoThumbMessage = {
  id: 'msg_img_no_thumb',
  from: '李四',
  type: 'image',
  body: { type: 'img' },
} as any

const videoNoThumbMessage = {
  id: 'msg_video_no_thumb',
  from: '王五',
  type: 'video',
  body: { type: 'video', duration: 95 },
} as any

const voiceMessage = {
  id: 'msg_voice',
  from: '王五',
  type: 'voice',
  body: { type: 'audio', duration: 748 },
} as any

const fileMessage = {
  id: 'msg_file',
  from: '赵六',
  type: 'file',
  body: { type: 'file', filename: '2026 年度规划.pdf' },
} as any
</script>

<template>
  <Story title="Modules/QuoteBar">
    <Variant title="文本引用">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="textMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="图片引用">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="imageMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="图片引用（无缩略图）">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="imageNoThumbMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="视频引用（无缩略图）">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="videoNoThumbMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="语音引用（带时长）">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="voiceMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="文件引用">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="fileMessage" @close="log('close')" />
      </div>
    </Variant>

    <Variant title="展示发送人头像">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="textMessage" show-avatar @close="log('close')" />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="textMessage" @close="log('close')" />
        <div style="padding: 12px; font-size: var(--uikit-font-size-11); color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
