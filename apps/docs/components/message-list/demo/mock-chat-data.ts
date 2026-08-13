/**
 * 消息列表演练场 mock 数据注入（docs 专用）
 *
 * 无登录渲染路径：向 conversation / message store 直灌 mock 数据后，
 * 在 UIKitProvider(:auto-init="false") 内渲染 EmMessageList 即可，
 * 与 Histoire story（message-list.story.vue）同一套模式。
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
export const MOCK_CONVERSATION_ID = 'mock_cvs_docs_001'

/** mock 消息公共字段 + 差异化部分 */
interface MockMessageSeed {
  msgLocalId: string
  from: string
  type: UiMessage['type']
  content?: string
  body?: UiMessage['body']
  timestamp: number
  isSelf: boolean
  status: UiMessage['status']
}

/** 按 SDK Message 契约补齐 mock 消息公共字段（渲染层只读取其中一部分） */
function buildMockMessage(seed: MockMessageSeed): UiMessage {
  return {
    msgServerId: '',
    msgLocalId: seed.msgLocalId,
    from: seed.from,
    to: MOCK_CONVERSATION_ID,
    sender: { userId: seed.from },
    conversationId: MOCK_CONVERSATION_ID,
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: seed.type,
    sendStatus: 'sent',
    ext: {},
    timestamp: seed.timestamp,
    // 文本消息 SDK 契约为 body: { content }（TextMessageType），渲染层直接读
    // body.content；seed.content 在此统一归位，避免 body 为 undefined 导致渲染报错
    body: seed.type === MESSAGE_TYPE.TEXT
      ? { content: seed.content ?? '' }
      : seed.body,
    content: seed.content,
    isSelf: seed.isSelf,
    status: seed.status,
  } as UiMessage
}

/** 注入 mock 会话 + 全类型消息，供消息列表演练场渲染 */
export function injectMockChatData(): void {
  const conversationStore = useConversationStore()
  const messageStore = useMessageStore()

  const conversation: UiConversation = {
    id: MOCK_CONVERSATION_ID,
    name: 'UIKIT 设计评审群',
    type: CONVERSATION_TYPE.GROUPCHAT,
    avatar: '',
    unreadCount: 0,
    lastMessageText: '我先同步到文档站，稍后给大家发链接。',
    marks: [],
    lastMessageTime: Date.now(),
    isPinned: false,
    isMuted: false,
  }

  conversationStore.setConversationList([conversation])
  conversationStore.setCurrentConversationId(conversation.id)

  const now = Date.now()

  // 全类型消息：文本 / 图片 / 语音 / 文件 / 位置 / 合并 / 发送中状态
  const mockMessages: UiMessage[] = [
    buildMockMessage({
      msgLocalId: 'mock_msg_1',
      from: 'user_lee',
      type: MESSAGE_TYPE.TEXT,
      content: '大家看下新版消息列表的视觉稿，重点看时间戳和头像区域。',
      timestamp: now - 26 * 60_000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_2',
      from: 'user_self',
      type: MESSAGE_TYPE.TEXT,
      content: '收到，我这边先整体过一遍。',
      timestamp: now - 25 * 60_000,
      isSelf: true,
      status: MESSAGE_STATUS.READ,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_3',
      from: 'user_lee',
      type: MESSAGE_TYPE.IMAGE,
      body: {
        localUrl: 'https://picsum.photos/300/200',
        filename: '视觉稿.png',
        width: 300,
        height: 200,
        isGif: false,
        isOriginalImage: false,
      },
      timestamp: now - 20 * 60_000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_4',
      from: 'user_self',
      type: MESSAGE_TYPE.VOICE,
      body: {
        url: '',
        filename: 'voice.amr',
        duration: 15,
        fileLength: 10240,
      },
      timestamp: now - 15 * 60_000,
      isSelf: true,
      status: MESSAGE_STATUS.DELIVERED,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_5',
      from: 'user_lee',
      type: MESSAGE_TYPE.FILE,
      body: {
        filename: '视觉规范-v3.pdf',
        fileSize: 5242880,
        url: '',
      },
      timestamp: now - 6 * 60_000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_6',
      from: 'user_self',
      type: MESSAGE_TYPE.LOCATION,
      body: {
        latitude: 39.909,
        longitude: 116.397,
        address: '北京市东城区',
        buildingName: '设计中心大厦',
      },
      timestamp: now - 3 * 60_000,
      isSelf: true,
      status: MESSAGE_STATUS.DELIVERED,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_7',
      from: 'user_lee',
      type: MESSAGE_TYPE.COMBINE,
      body: {
        title: '设计评审群的历史消息',
        summary: '张三: 这个虚拟列表方案不错\n李四: 具体怎么实现？',
        filename: 'combine.json',
        filetype: 'json',
        combineLevel: 1,
      },
      timestamp: now - 2 * 60_000,
      isSelf: false,
      status: MESSAGE_STATUS.READ,
    }),
    buildMockMessage({
      msgLocalId: 'mock_msg_8',
      from: 'user_self',
      type: MESSAGE_TYPE.TEXT,
      content: '我先同步到文档站，稍后给大家发链接。',
      timestamp: now - 1 * 60_000,
      isSelf: true,
      status: MESSAGE_STATUS.SENDING,
    }),
  ]

  messageStore.messageMap[conversation.id] = mockMessages
}
