/**
 * 群管理 / 群已读回执在线代码演练场初始模板（VuePlayground files）
 *
 * 多文件约定：'App.vue' 为用户主编辑区（容器 props + 可编辑配置对象），
 * 'mock.ts' 为 mock 群数据（群资料 / 角色 / 成员 / 公告 + 群会话 +
 * 含已读回执的群消息，一般不需要修改）。
 * 模板约束：只能 import import map 已覆盖的模块（vue / @easemob/uikit），
 * 预览 iframe 才能解析；外层必须包 EmUIKitProvider(:auto-init="false")。
 */
export const groupPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  EmGroupManagementSection,
  EmMessageList,
  EmUIKitProvider,
  GROUP_MEMBER_ROLE,
} from '@easemob/uikit'
import type { ChatConfig, GroupMemberRoleValue } from '@easemob/uikit'
import { MOCK_GROUP_ID, injectMockGroup, injectMockGroupChat } from './mock'

// ---------- mock 注入（免登录渲染，见 mock.ts） ----------
injectMockGroup(GROUP_MEMBER_ROLE.OWNER)
injectMockGroupChat()

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive<{
  role: GroupMemberRoleValue
  groupManagement: {
    displayMode: 'drawer' | 'modal'
    showMuteAll: boolean
    showMuteList: boolean
    showBlocklist: boolean
    showAllowlist: boolean
    showSharedFiles: boolean
    showJoinRequests: boolean
  }
  groupReadReceipt: {
    enabled: boolean
    maxGroupSize: number
  }
}>({
  role: GROUP_MEMBER_ROLE.OWNER,
  groupManagement: {
    displayMode: 'drawer',
    showMuteAll: true,
    showMuteList: true,
    showBlocklist: true,
    showAllowlist: false,
    showSharedFiles: true,
    showJoinRequests: false,
  },
  groupReadReceipt: {
    enabled: true,
    maxGroupSize: 200,
  },
})

// 切换角色视角：重新注入群资料（群管理入口随角色变化）
watch(
  () => config.role,
  (role) => {
    injectMockGroup(role)
  },
)

/** 组装为 EmMessageList 的 config 入参 */
const chatConfig = computed<ChatConfig>(() => ({
  groupReadReceipt: { ...config.groupReadReceipt },
  // mock 演练场无 SDK 连接，禁用历史加载避免 loadMoreHistory 报错
  messageList: { loadHistory: { enable: false } },
}))
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="playground__stage">
      <div class="playground__stage-inner">
        <!-- 上：群管理入口（群主 / 管理员可见全部入口，普通成员仅共享文件） -->
        <div class="playground__management">
          <EmGroupManagementSection
            :group-id="MOCK_GROUP_ID"
            :display-mode="config.groupManagement.displayMode"
            :show-mute-all="config.groupManagement.showMuteAll"
            :show-mute-list="config.groupManagement.showMuteList"
            :show-blocklist="config.groupManagement.showBlocklist"
            :show-allowlist="config.groupManagement.showAllowlist"
            :show-shared-files="config.groupManagement.showSharedFiles"
            :show-join-requests="config.groupManagement.showJoinRequests"
          />
        </div>
        <!-- 下：群消息列表（群已读回执圆圈三态：0 人空心圈 / 数字 / 全读对勾） -->
        <div class="playground__messages">
          <EmMessageList :config="chatConfig" />
        </div>
      </div>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.playground__stage {
  height: 520px;
  border: 1px solid var(--uikit-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--uikit-bg-base);
}

.playground__stage-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.playground__management {
  flex: none;
  max-width: 480px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color);
}

.playground__messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.playground__messages :deep(.message-list) {
  flex: 1;
}
</style>
`.trim(),
  'mock.ts': `
// mock 数据，一般不需要修改
import {
  CONVERSATION_TYPE,
  GROUP_MEMBER_ROLE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  useConversationStore,
  useGroupStore,
  useMessageStore,
} from '@easemob/uikit'
import type { GroupMemberRoleValue, UiConversation, UiMessage } from '@easemob/uikit'

/** mock 群 ID */
export const MOCK_GROUP_ID = 'mock_group_docs_001'

/** 注入群资料（角色可切换：owner / admin / member，影响群管理入口显示） */
export function injectMockGroup(role: GroupMemberRoleValue): void {
  const groupStore = useGroupStore()
  groupStore.setGroupList([
    {
      groupId: MOCK_GROUP_ID,
      groupName: '群能力演示群',
      description: '用于演示群已读回执与群管理配置',
      owner: 'u_self',
      role,
      memberCount: 24,
      maxUsers: 200,
      mute: false,
    },
  ])
  groupStore.setCurrentGroup({
    groupId: MOCK_GROUP_ID,
    groupName: '群能力演示群',
    description: '用于演示群已读回执与群管理配置',
    owner: 'u_self',
    role,
    memberCount: 24,
    maxUsers: 200,
    mute: false,
  })
  // 群成员：覆盖 owner / admin / member 三种角色，供成员列表与权限判断
  groupStore.groupMembersMap[MOCK_GROUP_ID] = [
    { userId: 'u_self', nickname: '我', role: GROUP_MEMBER_ROLE.OWNER, joinedAt: Date.now() - 86400_000 },
    { userId: 'u_admin', nickname: '管理员小环', role: GROUP_MEMBER_ROLE.ADMIN, joinedAt: Date.now() - 3600_000 },
    { userId: 'u_tom', nickname: '李雷', role: GROUP_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 1800_000 },
    { userId: 'u_lisi', nickname: '韩梅梅', role: GROUP_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 900_000 },
  ]
  // 群公告
  groupStore.groupAnnouncementMap[MOCK_GROUP_ID] = '欢迎加入群能力演示群，请遵守群规。'
}

/** 注入群会话 + 含已读回执的群消息（groupReadCount 驱动已读圆圈三态） */
export function injectMockGroupChat(): void {
  const conversationStore = useConversationStore()
  const messageStore = useMessageStore()

  const conversation: UiConversation = {
    id: MOCK_GROUP_ID,
    name: '群能力演示群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 0,
    lastMessageText: '李雷: 已读回执演示',
    marks: [],
    lastMessageTime: Date.now(),
    isPinned: false,
    isMuted: false,
  }
  conversationStore.setConversationList([conversation])
  conversationStore.setCurrentConversationId(conversation.id)

  const now = Date.now()
  const messages: UiMessage[] = [
    {
      msgServerId: 'group_msg_1',
      msgLocalId: 'group_msg_1',
      from: 'u_tom',
      to: MOCK_GROUP_ID,
      sender: { userId: 'u_tom' },
      conversationId: MOCK_GROUP_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 120_000,
      body: { content: '这条消息不携带已读回执数据。' },
      content: '这条消息不携带已读回执数据。',
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    } as UiMessage,
    {
      msgServerId: 'group_msg_2',
      msgLocalId: 'group_msg_2',
      from: 'u_self',
      to: MOCK_GROUP_ID,
      sender: { userId: 'u_self' },
      conversationId: MOCK_GROUP_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 90_000,
      body: { content: '开启「群已读回执」后，群聊己方消息默认激活已读圆圈。' },
      content: '开启「群已读回执」后，群聊己方消息默认激活已读圆圈。',
      isSelf: true,
      status: MESSAGE_STATUS.READ,
      requireGroupAck: true,
      groupReadCount: 0,
    } as UiMessage,
    {
      msgServerId: 'group_msg_3',
      msgLocalId: 'group_msg_3',
      from: 'u_self',
      to: MOCK_GROUP_ID,
      sender: { userId: 'u_self' },
      conversationId: MOCK_GROUP_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 60_000,
      body: { content: '第三条：部分已读（空心圈 + 数字）。' },
      content: '第三条：部分已读（空心圈 + 数字）。',
      isSelf: true,
      status: MESSAGE_STATUS.READ,
      requireGroupAck: true,
      groupReadCount: 5,
    } as UiMessage,
    {
      msgServerId: 'group_msg_4',
      msgLocalId: 'group_msg_4',
      from: 'u_self',
      to: MOCK_GROUP_ID,
      sender: { userId: 'u_self' },
      conversationId: MOCK_GROUP_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 30_000,
      body: { content: '第四条：全部已读（圆 + 对勾）。' },
      content: '第四条：全部已读（圆 + 对勾）。',
      isSelf: true,
      status: MESSAGE_STATUS.READ,
      requireGroupAck: true,
      groupReadCount: 24,
    } as UiMessage,
  ]

  messageStore.messageMap[MOCK_GROUP_ID] = messages
}
`.trim(),
}
