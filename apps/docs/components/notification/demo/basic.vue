<script setup lang="ts">
import { CONVERSATION_TYPE, useNotification } from '@easemob/uikit'

const { state, notify, close, closeAll } = useNotification()

function pushSingleChat() {
  notify({
    title: '张三',
    body: '晚上一起吃饭吗？',
    avatar: '',
    timestamp: Date.now(),
    conversationId: `user-${Math.random().toString(36).slice(2, 8)}`,
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
  })
}

function pushGroupChat() {
  notify({
    title: '项目讨论群',
    body: '李四: 新版本已经上线了',
    avatar: '',
    timestamp: Date.now(),
    conversationId: `group-${Math.random().toString(36).slice(2, 8)}`,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
  })
}

/** 同一会话 3s 窗口内连发三条，验证合并刷新（仅显示一张卡片） */
function pushMerged() {
  const conversationId = `merge-${Math.random().toString(36).slice(2, 8)}`
  const base = {
    conversationId,
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
  }
  notify({ title: '王五', body: '第一条', timestamp: Date.now(), ...base })
  notify({ title: '王五', body: '第二条', timestamp: Date.now(), ...base })
  notify({ title: '王五', body: '第三条', timestamp: Date.now(), ...base })
}
</script>

<template>
  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
    <em-button @click="pushSingleChat">单聊消息</em-button>
    <em-button type="success" @click="pushGroupChat">群聊消息</em-button>
    <em-button type="warning" @click="pushMerged">3s 合并连发</em-button>
    <em-button type="danger" @click="closeAll">全部关闭</em-button>
    <em-notification-container
      :items="state.list"
      @close="close"
    />
  </div>
</template>
