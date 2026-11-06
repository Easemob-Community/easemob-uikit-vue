import type { ConversationItem, SessionMessageSnippet } from 'easemob-websdk'
import { describe, expect, it, vi } from 'vitest'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-sdk-contract'
import type { SdkMessage, UiMessage } from '@easemob-community/uikit-sdk-contract'
import { extractLastMessageText, extractSnippetText } from './message-adapter'
import { toUiConversation } from './conversation-adapter'

function makeMessage(ext: Record<string, unknown>): SdkMessage {
  return {
    msgServerId: 'srv-1',
    msgLocalId: 'local-1',
    from: 'alice',
    to: 'group-1',
    sender: { userId: 'alice' },
    conversationId: 'group-1',
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.IMAGE,
    sendStatus: MESSAGE_STATUS.SENT,
    ext,
    timestamp: 1700000000000,
    body: { localUrl: '', originalImageUrl: 'https://example.com/biubiu.gif', isGif: true },
  }
}

function makeSnippet(ext?: Record<string, unknown>): SessionMessageSnippet {
  return {
    msgServerId: 'srv-1',
    msgLocalId: 'local-1',
    from: 'alice',
    to: 'group-1',
    sender: { userId: 'alice', nickname: 'Alice SDK' },
    conversationId: 'group-1',
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    type: MESSAGE_TYPE.IMAGE,
    sendStatus: MESSAGE_STATUS.SENT,
    ext,
    timestamp: 1700000000000,
    body: { isGif: true },
  }
}

function makeConversation(lastMessage: SessionMessageSnippet): ConversationItem {
  return {
    conversationId: 'group-1',
    conversationType: CONVERSATION_TYPE.GROUPCHAT,
    conversationName: 'group-1',
    unreadCount: 0,
    lastMessage,
    marks: [],
    remindType: 'DEFAULT',
  }
}

const resolveSticker = (message: UiMessage) =>
  message.ext?.stickerCode === 'huanxin.biubiu' ? '[亮个相吧]' : undefined

describe('动画表情消息预览', () => {
  it('完整图片消息支持业务 resolver', () => {
    expect(extractLastMessageText(makeMessage({ isSticker: true, stickerCode: 'huanxin.biubiu' }), undefined, resolveSticker)).toBe('[亮个相吧]')
  })

  it('未注入 resolver 时区分动画表情和普通 GIF', () => {
    expect(extractLastMessageText(makeMessage({ isSticker: true }))).toBe('[表情]')
    expect(extractLastMessageText(makeMessage({}))).toBe('[图片]')
  })

  it('业务 resolver 不接管时保留完整消息的默认摘要', () => {
    expect(extractLastMessageText(makeMessage({ isSticker: true }), undefined, () => undefined)).toBe('[表情]')
    expect(extractLastMessageText(makeMessage({}), undefined, () => undefined)).toBe('[图片]')
  })
})

describe('SessionMessageSnippet 消息预览', () => {
  it('将快照归一化为 UiMessage 并调用业务 resolver', () => {
    const resolver = vi.fn(resolveSticker)
    const snippet = makeSnippet({ isSticker: true, stickerCode: 'huanxin.biubiu' })

    expect(extractSnippetText(snippet, undefined, resolver)).toBe('[亮个相吧]')
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'group-1',
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
      ext: { isSticker: true, stickerCode: 'huanxin.biubiu' },
      isSelf: false,
      status: MESSAGE_STATUS.SENT,
    }))
  })

  it('使用会话上下文补齐快照缺失的可选字段', () => {
    const snippet = {
      ...makeSnippet({ isSticker: true, stickerCode: 'huanxin.biubiu' }),
      conversationId: undefined,
      conversationType: undefined,
      ext: undefined,
    }
    const resolver = vi.fn((message: UiMessage) => {
      expect(message.conversationId).toBe('group-1')
      expect(message.conversationType).toBe(CONVERSATION_TYPE.GROUPCHAT)
      expect(message.ext).toEqual({})
      return '[动画表情]'
    })

    expect(extractSnippetText(snippet, undefined, resolver, {
      conversationId: 'group-1',
      conversationType: CONVERSATION_TYPE.GROUPCHAT,
    })).toBe('[动画表情]')
  })

  it('会话转换复用 resolver 并保留群聊发送者前缀', () => {
    const result = toUiConversation(makeConversation(makeSnippet({ isSticker: true, stickerCode: 'huanxin.biubiu' })), {
      resolveSenderName: () => 'Alice',
      lastMessageTextResolver: resolveSticker,
    })

    expect(result.lastMessageText).toBe('Alice SDK: [亮个相吧]')
  })

  it('未注入 resolver 时快照同样区分动画表情和普通 GIF', () => {
    expect(extractSnippetText(makeSnippet({ isSticker: true }))).toBe('[表情]')
    expect(extractSnippetText(makeSnippet({}))).toBe('[图片]')
  })

  it('业务 resolver 不接管时保留快照的默认摘要', () => {
    expect(extractSnippetText(makeSnippet({ isSticker: true }), undefined, () => undefined)).toBe('[表情]')
    expect(extractSnippetText(makeSnippet({}), undefined, () => undefined)).toBe('[图片]')
  })

  it('完整消息与会话快照都按 multi_body 分段生成摘要', () => {
    const body = [
      { type: 'text', content: '请看资料' },
      { type: 'image', localUrl: '', originalImageUrl: 'https://example.com/a.jpg', isGif: false, isOriginalImage: false },
    ] as const
    const message = makeMessage({})
    const snippet = makeSnippet({})

    expect(extractLastMessageText({ ...message, type: MESSAGE_TYPE.MULTI_BODY, body })).toBe('请看资料 ...')
    expect(extractSnippetText({ ...snippet, type: MESSAGE_TYPE.MULTI_BODY, body })).toBe('请看资料 ...')
  })
})
