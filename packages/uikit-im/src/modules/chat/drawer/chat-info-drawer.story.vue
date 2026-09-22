<script setup lang="ts">
import { ref } from 'vue'
import { EmButton as Button, CONVERSATION_TYPE, GROUP_MEMBER_ROLE } from '@easemob-community/uikit-core'
import type { UiConversation, UiGroupMember } from '@easemob-community/uikit-core'
import { useGroupStore } from '../../../store/group'
import UIKitProvider from '../../../containers/uikit-provider/uikit-provider.vue'
import ChatInfoDrawer from './chat-info-drawer.vue'

const groupConversation: UiConversation = {
  id: 'g_story_001',
  name: 'Vue 技术交流群',
  avatar: '',
  type: CONVERSATION_TYPE.GROUPCHAT,
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
  type: CONVERSATION_TYPE.SINGLECHAT,
  unreadCount: 0,
  lastMessageText: '',
  isPinned: false,
  isMuted: false,
  marks: [],
}

const mockMembers: UiGroupMember[] = [
  { userId: 'owner_001', nickname: '群主大大', role: GROUP_MEMBER_ROLE.OWNER },
  { userId: 'admin_001', nickname: '管理员 A', role: GROUP_MEMBER_ROLE.ADMIN },
  { userId: 'member_001', nickname: '小李' },
  { userId: 'member_002', nickname: '阿强' },
  { userId: 'member_003', nickname: 'Bob' },
  { userId: 'member_004', nickname: 'Alice' },
  { userId: 'member_005', nickname: 'Carol' },
  { userId: 'member_006', nickname: 'David' },
  { userId: 'member_007', nickname: 'Eve' },
  { userId: 'member_008', nickname: 'Frank' },
]

const showGroup = ref(false)
const showSingle = ref(false)

// 为群聊一级页/二级页提供群主角色、成员缓存、公告与计数
const groupStore = useGroupStore()
groupStore.addGroup({
  groupId: 'g_story_001',
  groupName: 'Vue 技术交流群',
  role: GROUP_MEMBER_ROLE.OWNER,
  memberCount: mockMembers.length,
})
groupStore.setGroupMembers('g_story_001', mockMembers)
groupStore.setGroupAnnouncement('g_story_001', '欢迎来到 Vue 技术交流群，请文明发言～')
groupStore.groupJoinRequestsMap.g_story_001 = [
  { applicant: { userId: 'req_001', nickname: '申请加入的人' }, status: 'pending', reason: '想学习 Vue' },
]
// 成员页 tabs（All/Admin/Muted/Blocked）+ 行内徽标演示：注入禁言/拉黑缓存
// （story 未初始化 SDK，members 页挂载时对禁言/拉黑列表的拉取会失败并静默 warn，展示以本地缓存为准）
groupStore.setGroupMuteList('g_story_001', [
  { userId: 'member_002', nickname: '阿强' },
])
groupStore.setGroupBlocklist('g_story_001', [
  { userId: 'member_007', nickname: 'Eve' },
])

function onEvent(name: string, payload?: unknown) {
  console.log(`[ChatInfoDrawer Story] ${name}`, payload)
}
</script>

<template>
  <Story title="Modules/ChatInfoDrawer">
    <Variant title="Group Chat">
      <UIKitProvider :auto-init="false">
        <div style="position: relative; height: 600px; border: 1px solid #e5e7eb;">
          <Button @click="showGroup = true">
            打开群信息抽屉
          </Button>
          <p style="margin-top: 8px; color: var(--uikit-text-secondary); font-size: 13px;">
            进入后点击「查看全部」或假搜索框进入成员页：tabs（All/Admin/禁言/拉黑）+ 共享搜索（命中高亮）+ 实底徽标 + ⋮ 菜单（带图标）
          </p>
          <ChatInfoDrawer
            v-model:show="showGroup"
            :conversation="groupConversation"
            :is-group="true"
            show-message-search
            @leave-group="(id) => onEvent('leave-group', id)"
            @destroy-group="(id) => onEvent('destroy-group', id)"
            @clear-history="(p) => onEvent('clear-history', p)"
            @add-member="(id) => onEvent('add-member', id)"
            @chat-member="(m) => onEvent('chat-member', m)"
            @view-profile="(userId) => onEvent('view-profile', userId)"
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
          <Button @click="showSingle = true">
            打开好友信息抽屉
          </Button>
          <ChatInfoDrawer
            v-model:show="showSingle"
            :conversation="singleConversation"
            :is-group="false"
            @clear-history="(p) => onEvent('clear-history', p)"
            @view-profile="(userId) => onEvent('view-profile', userId)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Section Slots Takeover">
      <UIKitProvider :auto-init="false">
        <div style="position: relative; height: 600px; border: 1px solid #e5e7eb;">
          <Button @click="showGroup = true">
            打开 Section 接管示例
          </Button>
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
          >
            <template #drawer-footer="{ isGroup, memberCount }">
              <div style="padding: 16px; background: var(--uikit-bg-secondary);">
                <div style="margin-bottom: 8px; color: var(--uikit-text-secondary); font-size: 13px;">
                  自定义 Footer：{{ isGroup ? `共 ${memberCount} 位成员` : '单聊自定义操作区' }}
                </div>
                <Button type="danger-outline" block @click="showGroup = false">
                  关闭抽屉
                </Button>
              </div>
            </template>
            <template #drawer-members="{ members, canAddMember }">
              <div style="padding: 16px; background: var(--uikit-bg-base); border-radius: 8px;">
                <div style="margin-bottom: 8px; color: var(--uikit-text-secondary); font-size: 13px;">
                  自定义成员区（{{ members.length }} 人）
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <span
                    v-for="member in members.slice(0, 4)"
                    :key="member.userId"
                    style="padding: 4px 8px; background: var(--uikit-bg-secondary); border-radius: 4px; font-size: 13px;"
                  >
                    {{ member.nickname || member.userId }}
                  </span>
                  <span v-if="canAddMember" style="padding: 4px 8px; color: var(--uikit-primary-color); font-size: 13px;">
                    + 添加成员
                  </span>
                </div>
              </div>
            </template>
          </ChatInfoDrawer>
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
