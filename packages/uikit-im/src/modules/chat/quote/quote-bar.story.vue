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

    <Variant title="事件日志">
      <div style="width: 480px; background: var(--uikit-bg-base); border-radius: 8px;">
        <QuoteBar :message="textMessage" @close="log('close')" />
        <div style="padding: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
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
