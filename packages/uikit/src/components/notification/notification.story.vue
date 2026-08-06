<script setup lang="ts">
import { ref } from 'vue'
import { CONVERSATION_TYPE } from '../../constants'
import { useNotification } from '../../composables/use-notification'
import Button from '../button/button.vue'
import Notification from './notification.vue'
import NotificationContainer from './notification-container.vue'
import type { NotificationItem } from './types'

const { state, notify, close, closeAll } = useNotification()

const sampleItem: NotificationItem = {
  id: 'sample-1',
  title: '张三',
  body: '晚上一起吃饭吗？',
  avatar: '',
  timestamp: Date.now(),
  conversationId: 'user-zhangsan',
  conversationType: CONVERSATION_TYPE.SINGLECHAT,
  unreadCount: 1,
}

const closedId = ref('')
const clickedItem = ref('')

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

/** 同会话 3s 窗口内连发三条，验证合并刷新（仅显示一张卡片） */
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
  <Story title="Notification">
    <Variant title="Single Card">
      <div class="u-mb-4">
        <Notification
          :item="sampleItem"
          @close="id => closedId = id"
          @click="item => clickedItem = `${item.title} - ${item.body}`"
        />
      </div>
      <p v-if="closedId" class="u-text-sm u-mt-2">已关闭: {{ closedId }}</p>
      <p v-if="clickedItem" class="u-text-sm u-mt-2">点击了: {{ clickedItem }}</p>
    </Variant>

    <Variant title="Stacked Container">
      <div class="u-flex u-gap-2 u-mb-4">
        <Button @click="pushSingleChat">单聊消息</Button>
        <Button type="success" @click="pushGroupChat">群聊消息</Button>
        <Button type="warning" @click="pushMerged">3s 合并连发</Button>
        <Button @click="closeAll">全部关闭</Button>
      </div>
      <NotificationContainer
        :items="state.list"
        @close="id => { close(id); closedId = id }"
        @click="item => clickedItem = `${item.title} - ${item.body}`"
      />
      <p v-if="closedId" class="u-text-sm u-mt-2">已关闭: {{ closedId }}</p>
      <p v-if="clickedItem" class="u-text-sm u-mt-2">点击了: {{ clickedItem }}</p>
    </Variant>
  </Story>
</template>
