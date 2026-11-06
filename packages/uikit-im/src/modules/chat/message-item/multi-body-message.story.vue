<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { MESSAGE_STATUS, MESSAGE_TYPE, useThemeStore } from '@easemob-community/uikit-core'
import type { MultiBody, UiMessage } from '@easemob-community/uikit-core'
import UIKitProvider from '../../../containers/uikit-provider/uikit-provider.vue'
import MessageRenderer from './message-renderer.vue'
import MessageBubbleWrapper from './message-bubble-wrapper.vue'

const themeStore = useThemeStore()
onBeforeUnmount(() => themeStore.setMode('light'))

const mixedBody: MultiBody = [
  { type: 'text', content: '请看设计稿，链接 https://example.com 和 @designer 都可以点击。' },
  { type: 'image', localUrl: '', originalImageUrl: 'https://picsum.photos/480/320', thumbnailUrl: 'https://picsum.photos/240/160', isGif: false, isOriginalImage: false },
  { type: 'text', content: '第三版已更新' },
]

const allTypesBody: MultiBody = [
  { type: 'text', content: '七类分段' },
  { type: 'image', localUrl: '', originalImageUrl: 'https://picsum.photos/480/320', isGif: false, isOriginalImage: false },
  { type: 'file', url: 'https://example.com/spec.pdf', filename: 'spec.pdf', fileLength: 2048 },
  { type: 'voice', url: 'https://example.com/voice.amr', duration: 3 },
  { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnailUrl: 'https://picsum.photos/240/160', duration: 8, width: 640, height: 360 },
  { type: 'location', latitude: 31.2304, longitude: 121.4737, address: '上海' },
  { type: 'custom', event: 'userCard', params: { userId: 'user-1' } },
]

const longBody: MultiBody = Array.from({ length: 21 }, (_, index) => (
  index % 2 === 0
    ? { type: 'text' as const, content: `第 ${index + 1} 段文本` }
    : { type: 'image' as const, localUrl: '', originalImageUrl: `https://picsum.photos/seed/${index}/240/160`, isGif: false, isOriginalImage: false }
))

function makeMessage(
  body: MultiBody,
  overrides: Partial<Pick<UiMessage, 'from' | 'sender' | 'isSelf' | 'status' | 'sendStatus'>> = {},
): UiMessage {
  return {
    msgServerId: 'srv-multi',
    msgLocalId: 'loc-multi',
    localId: 'loc-multi',
    from: 'designer',
    to: 'me',
    sender: { userId: 'designer', nickname: 'Designer' },
    conversationId: 'group-1',
    conversationType: 'groupChat',
    type: MESSAGE_TYPE.MULTI_BODY,
    sendStatus: MESSAGE_STATUS.SENT,
    status: MESSAGE_STATUS.SENT,
    isSelf: false,
    ext: {},
    timestamp: Date.now(),
    body,
    ...overrides,
  }
}
</script>

<template>
  <Story title="Chat/MultiBodyMessage">
    <Variant title="文字-图片-文字">
      <UIKitProvider :auto-init="false">
        <div class="multi-body-story">
          <MessageRenderer :message="makeMessage(mixedBody)" />
          <MessageRenderer :message="makeMessage(mixedBody, { isSelf: true, from: 'me', sender: { userId: 'me' } })" />
        </div>
      </UIKitProvider>
    </Variant>
    <Variant title="七类分段">
      <UIKitProvider :auto-init="false">
        <div class="multi-body-story">
          <MessageRenderer :message="makeMessage(allTypesBody)" />
        </div>
      </UIKitProvider>
    </Variant>
    <Variant title="21 段 / 窄屏 / 暗色">
      <UIKitProvider :auto-init="false">
        <div class="multi-body-story multi-body-story--mobile" @vue:mounted="themeStore.setMode('dark')">
          <MessageRenderer :message="makeMessage(longBody)" />
        </div>
      </UIKitProvider>
    </Variant>
    <Variant title="父消息发送状态">
      <UIKitProvider :auto-init="false">
        <div class="multi-body-story">
          <MessageBubbleWrapper :message="makeMessage(mixedBody, { isSelf: true, status: MESSAGE_STATUS.SENDING, sendStatus: MESSAGE_STATUS.SENDING })" />
          <MessageBubbleWrapper :message="makeMessage(mixedBody, { isSelf: true, status: MESSAGE_STATUS.FAILED, sendStatus: MESSAGE_STATUS.FAILED })" />
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>

<style>
.multi-body-story {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
  padding: 24px;
}

.multi-body-story--mobile {
  max-width: 390px;
}
</style>
