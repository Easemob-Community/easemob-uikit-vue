/**
 * 群能力（群已读回执 / 群管理）演练场 mock 数据注入（docs 专用）
 *
 * 免登录渲染路径：向 group / conversation / message store 直灌 mock 数据，
 * 在 UIKitProvider(:auto-init="false") 内渲染 EmGroupManagementSection +
 * EmMessageList 即可，与 Histoire story（group-management-section.story.vue）同一套模式。
 *
 * 注意：本模块只在 demo 组件 <script setup> 顶层调用；demo 经 Docs 主题
 * DemoBlock 的 ClientOnly 包裹，仅客户端挂载时执行，不触碰 SSR。
 */
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
