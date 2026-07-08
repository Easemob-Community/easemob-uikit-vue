<script setup lang="ts">
import { ref } from 'vue'
import ChatInfoDrawer from './chat-info-drawer.vue'
import UIKitProvider from '../../../containers/uikit-provider/uikit-provider.vue'
import Button from '../../../components/button/button.vue'
import { useGroupStore } from '../../../store/group'
import type { UiConversation, UiGroupMember } from '../../../sdk/types'

const groupConversation: UiConversation = {
  id: 'g_story_001',
  name: 'Vue 技术交流群',
  avatar: '',
  type: 'groupChat',
  unreadCount: 0,
  lastMessageText: '',
  isPinned: false,
  isMuted: false,
  marks: [],
}

const singleConversation: UiConversation = {
  id: 'u_story_001',
  name: '张三',
  avatar: '',
  type: 'singleChat',
  unreadCount: 0,
  lastMessageText: '',
  isPinned: false,
  isMuted: false,
  marks: [],
}

const mockMembers: UiGroupMember[] = [
  { userId: 'owner_001', nickname: '群主大大', role: 'owner' },
  { userId: 'admin_001', nickname: '管理员 A', role: 'admin' },
  { userId: 'member_001', nickname: '小李' },
  { userId: 'member_002', nickname: '阿强' },
  { userId: 'member_003', nickname: 'Bob' },
  { userId: 'member_004', nickname: 'Alice' },
]

const showGroup = ref(false)
const showSingle = ref(false)

// 为群管理区块提供群主角色与计数
const groupStore = useGroupStore()
groupStore.addGroup({
  groupId: 'g_story_001',
  groupName: 'Vue 技术交流群',
  role: 'owner',
  memberCount: mockMembers.length,
})
groupStore.groupJoinRequestsMap.g_story_001 = [
  { applicant: { userId: 'req_001', nickname: '申请加入的人' }, status: 'pending', reason: '想学习 Vue' },
]

function onEvent(name: string, payload?: unknown) {
  console.log(`[ChatInfoDrawer Story] ${name}`, payload)
}
</script>

<template>
  <Story title="Modules/ChatInfoDrawer">
    <Variant title="Group Chat">
      <UIKitProvider :auto-init="false">
        <div style="position: relative; height: 600px; border: 1px solid #e5e7eb;">
          <Button @click="showGroup = true">打开群信息抽屉</Button>
          <ChatInfoDrawer
            v-model:show="showGroup"
            :conversation="groupConversation"
            :is-group="true"
            @leave-group="(id) => onEvent('leave-group', id)"
            @destroy-group="(id) => onEvent('destroy-group', id)"
            @clear-history="(p) => onEvent('clear-history', p)"
            @add-member="(id) => onEvent('add-member', id)"
            @chat-member="(m) => onEvent('chat-member', m)"
            @remove-member="(m) => onEvent('remove-member', m)"
            @set-admin="(m) => onEvent('set-admin', m)"
            @remove-admin="(m) => onEvent('remove-admin', m)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Single Chat">
      <UIKitProvider :auto-init="false">
        <div style="position: relative; height: 600px; border: 1px solid #e5e7eb;">
          <Button @click="showSingle = true">打开好友信息抽屉</Button>
          <ChatInfoDrawer
            v-model:show="showSingle"
            :conversation="singleConversation"
            :is-group="false"
            @clear-history="(p) => onEvent('clear-history', p)"
          />
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
