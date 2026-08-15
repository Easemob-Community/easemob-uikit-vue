/**
 * 会话列表演练场 mock 数据注入（docs 专用）
 *
 * 免登录渲染路径：向 conversation / presence store 直灌 mock 会话数据，
 * 在 UIKitProvider(:auto-init="false") 内渲染 EmConversationContainer 即可，
 * 与 Histoire story（conversation-container.story.vue）同一套模式。
 *
 * 注意：本模块只在 demo 组件 <script setup> 顶层调用；demo 经 Docs 主题
 * DemoBlock 的 ClientOnly 包裹，仅客户端挂载时执行，不触碰 SSR。
 */
import { CONVERSATION_TYPE, useConversationStore, usePresenceStore } from '@easemob/uikit-im'
import type { UiConversation, UiPresence } from '@easemob/uikit-im'

/**
 * 注入 mock 会话列表（覆盖未读 / 置顶 / 免打扰 / @我 / 单聊 / 群聊场景）
 * 与单聊在线状态。多次调用幂等：直接覆盖 store 列表，避免残留。
 */
export function injectMockConversations(): void {
  const conversationStore = useConversationStore()
  const now = Date.now()

  const list: UiConversation[] = [
    {
      id: 'u_alice',
      name: 'Alice',
      type: CONVERSATION_TYPE.SINGLECHAT,
      avatar: 'https://picsum.photos/seed/alice/96',
      unreadCount: 2,
      lastMessageText: '晚上一起吃饭吗？',
      lastMessageTime: now - 5 * 60_000,
      isPinned: true,
      isMuted: false,
      marks: [],
    },
    {
      id: 'u_bob',
      name: 'Bob',
      type: CONVERSATION_TYPE.SINGLECHAT,
      avatar: 'https://picsum.photos/seed/bob/96',
      unreadCount: 0,
      lastMessageText: '文件已发送',
      lastMessageTime: now - 30 * 60_000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'u_carol',
      name: 'Carol',
      type: CONVERSATION_TYPE.SINGLECHAT,
      avatar: 'https://picsum.photos/seed/carol/96',
      unreadCount: 1,
      lastMessageText: '收到，谢谢！',
      lastMessageTime: now - 2 * 60 * 60_000,
      isPinned: false,
      isMuted: true,
      marks: [],
    },
    {
      id: 'u_david',
      name: 'David',
      type: CONVERSATION_TYPE.SINGLECHAT,
      avatar: 'https://picsum.photos/seed/david/96',
      unreadCount: 0,
      lastMessageText: '明天见',
      lastMessageTime: now - 5 * 60 * 60_000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'g_team',
      name: '产品技术群',
      type: CONVERSATION_TYPE.GROUPCHAT,
      unreadCount: 5,
      lastMessageText: 'Tom: 版本已发布',
      lastMessageFrom: 'u_tom',
      lastMessageTime: now - 10 * 60_000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'g_design',
      name: 'UIKIT 设计评审群',
      type: CONVERSATION_TYPE.GROUPCHAT,
      unreadCount: 0,
      lastMessageText: '李四: 视觉稿已更新',
      lastMessageFrom: 'u_lisi',
      lastMessageTime: now - 40 * 60_000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'g_market',
      name: '市场运营群',
      type: CONVERSATION_TYPE.GROUPCHAT,
      unreadCount: 99,
      lastMessageText: '王五: 活动方案初稿',
      lastMessageFrom: 'u_wangwu',
      lastMessageTime: now - 3 * 60 * 60_000,
      isPinned: false,
      isMuted: true,
      marks: [],
    },
    {
      id: 'g_notice',
      name: '全员通知群',
      type: CONVERSATION_TYPE.GROUPCHAT,
      unreadCount: 0,
      lastMessageText: '管理员: 本周五 15:00 全员大会',
      lastMessageFrom: 'u_admin',
      lastMessageTime: now - 8 * 60 * 60_000,
      isPinned: true,
      isMuted: false,
      marks: [],
    },
  ]

  conversationStore.setConversationList(list)

  // 产品技术群命中「@我」，用于 @我 分栏演示
  conversationStore.setAtMe('g_team', true)
}

/** 注入 mock 单聊在线状态（配合 enable-presence 开关展示） */
export function injectMockPresence(): void {
  const presenceStore = usePresenceStore()
  const list: UiPresence[] = [
    { userId: 'u_alice', status: 'online', ext: '', lastTime: Date.now() },
    { userId: 'u_bob', status: 'busy', ext: 'busy', lastTime: Date.now() },
    { userId: 'u_carol', status: 'away', ext: 'away', lastTime: Date.now() },
  ]
  presenceStore.updateBatch(list)
}

/** mock dataSource：未连接 SDK，空实现避免订阅报错 */
export const mockPresenceDataSource = {
  subscribePresence: async () => {},
}
