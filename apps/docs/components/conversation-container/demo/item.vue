<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'

const now = Date.now()

const singleChat = {
  id: 'u_alice',
  name: 'Alice',
  type: 'singleChat',
  unreadCount: 5,
  lastMessageText: '明天下午三点开会，记得带上方案',
  lastMessageTime: now - 5 * 60 * 1000,
  isPinned: false,
  isMuted: false,
  marks: [],
}

const groupChat = {
  id: 'g_001',
  name: 'Vue 技术交流群',
  type: 'groupChat',
  unreadCount: 128,
  lastMessageText: '张三: 这个虚拟列表的性能优化方案不错',
  lastMessageTime: now - 60 * 60 * 1000,
  isPinned: true,
  isMuted: false,
  marks: [],
}

const mutedChat = {
  id: 'u_bob',
  name: 'Bob',
  type: 'singleChat',
  unreadCount: 12,
  lastMessageText: '晚上一起吃饭吗？',
  lastMessageTime: now - 3 * 60 * 60 * 1000,
  isPinned: false,
  isMuted: true,
  marks: [],
}

const dotChat = {
  id: 'u_carol',
  name: 'Carol',
  type: 'singleChat',
  unreadCount: 3,
  lastMessageText: '文件已经发你邮箱了',
  lastMessageTime: now - 24 * 60 * 60 * 1000,
  isPinned: false,
  isMuted: false,
  marks: [],
}
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div
      style="
        width: 320px;
        margin: 0 auto;
        background: var(--uikit-bg-base);
        border-radius: 8px;
        overflow: hidden;
      "
    >
      <em-conversation-item :conversation="singleChat" />
      <em-conversation-item :conversation="groupChat" />
      <em-conversation-item :conversation="mutedChat" />
      <em-conversation-item :conversation="dotChat" unread-mode="dot" />
    </div>
  </EmUIKitProvider>
</template>
