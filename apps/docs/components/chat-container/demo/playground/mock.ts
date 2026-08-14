/**
 * 输入框配置演练场 mock 数据注入（docs 专用）
 *
 * 免登录渲染路径：向 conversation / message store 直灌 mock 会话与消息后，
 * 在 UIKitProvider(:auto-init="false") 内渲染 EmMessageInput + EmMessageList。
 * 发送行为由 beforeSend 钩子接管：把消息写入 message store 模拟发送成功，
 * 不触碰 SDK（与 Histoire story 同一套模式）。
 *
 * 注意：本模块只在 demo 组件 <script setup> 顶层调用；demo 经 Docs 主题
 * DemoBlock 的 ClientOnly 包裹，仅客户端挂载时执行，不触碰 SSR。
 */
import {
  CONVERSATION_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  useConversationStore,
  useMessageStore,
} from '@easemob/uikit'
import type { UiConversation, UiMessage } from '@easemob/uikit'

/** mock 会话 ID（多次注入时复用同一会话，避免列表残留） */
export const MOCK_INPUT_CONVERSATION_ID = 'mock_input_docs_001'

/** 注入 mock 群聊会话 + 初始消息，并设为当前会话（输入框依赖 currentConversation） */
export function injectMockInputContext(): void {
  const conversationStore = useConversationStore()
  const messageStore = useMessageStore()

  const conversation: UiConversation = {
    id: MOCK_INPUT_CONVERSATION_ID,
    name: '输入框配置演示群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 0,
    lastMessageText: '大家试下输入框配置',
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
      msgServerId: 'input_mock_1',
      msgLocalId: 'input_mock_1',
      from: 'u_tom',
      to: MOCK_INPUT_CONVERSATION_ID,
      sender: { userId: 'u_tom' },
      conversationId: MOCK_INPUT_CONVERSATION_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 60_000,
      body: { content: '左边面板可以实时切换输入框的形态和功能开关' },
      content: '左边面板可以实时切换输入框的形态和功能开关',
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    } as UiMessage,
    {
      msgServerId: 'input_mock_2',
      msgLocalId: 'input_mock_2',
      from: 'u_self',
      to: MOCK_INPUT_CONVERSATION_ID,
      sender: { userId: 'u_self' },
      conversationId: MOCK_INPUT_CONVERSATION_ID,
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      type: MESSAGE_TYPE.TEXT,
      sendStatus: 'sent',
      ext: {},
      timestamp: now - 30_000,
      body: { content: '简单 / 富文本、微信 / 飞书风格都能试' },
      content: '简单 / 富文本、微信 / 飞书风格都能试',
      isSelf: true,
      status: MESSAGE_STATUS.READ,
    } as UiMessage,
  ]

  messageStore.messageMap[MOCK_INPUT_CONVERSATION_ID] = messages
}

/** mock 发送：构造一条已发送文本消息写入 store，返回 false 阻止 SDK 真实发送 */
export function appendMockSentMessage(text: string): boolean {
  const messageStore = useMessageStore()
  const list = messageStore.messageMap[MOCK_INPUT_CONVERSATION_ID] || []
  const msg: UiMessage = {
    msgServerId: '',
    msgLocalId: `input_mock_sent_${Date.now()}`,
    from: 'u_self',
    to: MOCK_INPUT_CONVERSATION_ID,
    sender: { userId: 'u_self' },
    conversationId: MOCK_INPUT_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: 'sent',
    ext: {},
    timestamp: Date.now(),
    body: { content: text },
    content: text,
    isSelf: true,
    status: MESSAGE_STATUS.SENT,
  } as UiMessage
  messageStore.messageMap[MOCK_INPUT_CONVERSATION_ID] = [...list, msg]
  return false
}

/** @提及联系人（mock） */
export const mockMentionContacts = [
  { userId: 'u_alice', name: 'Alice', avatar: 'https://picsum.photos/seed/alice/64' },
  { userId: 'u_bob', name: 'Bob', avatar: 'https://picsum.photos/seed/bob/64' },
  { userId: 'u_carol', name: 'Carol', avatar: 'https://picsum.photos/seed/carol/64' },
]
