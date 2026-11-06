<script setup lang="ts">
import { MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-im'
import type { UiMessage } from '@easemob-community/uikit-im'
import { EmMultiBodyMessage, EmUIKitProvider } from '@easemob-community/uikit-im'

const message: UiMessage = {
  msgServerId: 'demo-multi-body',
  msgLocalId: 'demo-multi-body',
  localId: 'demo-multi-body',
  from: 'designer',
  to: 'me',
  sender: { userId: 'designer', nickname: 'Designer' },
  conversationId: 'demo-group',
  conversationType: 'groupChat',
  type: MESSAGE_TYPE.MULTI_BODY,
  sendStatus: MESSAGE_STATUS.SENT,
  status: MESSAGE_STATUS.SENT,
  isSelf: false,
  ext: {},
  timestamp: Date.now(),
  body: [
    { type: 'text', content: '请看设计稿，第三版已更新。' },
    {
      type: 'image',
      localUrl: '',
      originalImageUrl: 'https://picsum.photos/480/320',
      thumbnailUrl: 'https://picsum.photos/240/160',
      isGif: false,
      isOriginalImage: false,
    },
    { type: 'text', content: '文字仍支持链接 https://example.com 和 @提及高亮。' },
  ],
}
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="multi-body-demo">
      <EmMultiBodyMessage :message="message" />
    </div>
  </EmUIKitProvider>
</template>

<style>
.multi-body-demo {
  max-width: 560px;
  padding: 16px;
}
</style>
