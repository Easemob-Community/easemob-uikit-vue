import type { ConversationItem } from 'easemob-websdk'
import { describe, expect, it, vi } from 'vitest'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob-community/uikit-sdk-contract'
import type { UiConversation } from '@easemob-community/uikit-sdk-contract'
import type { ManagerHost } from '../../client'
import type { ConversationStoreLike } from '../conversation-domain'
import { ConversationDomain } from '../conversation-domain'

function makeSdkConversation(): ConversationItem {
  return {
    conversationId: 'c1',
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    conversationName: 'c1',
    unreadCount: 0,
    lastMessage: {
      msgServerId: 'srv-1',
      msgLocalId: 'local-1',
      from: 'alice',
      to: 'me',
      sender: { userId: 'alice' },
      conversationId: 'c1',
      conversationType: CONVERSATION_TYPE.SINGLECHAT,
      type: MESSAGE_TYPE.IMAGE,
      sendStatus: MESSAGE_STATUS.SENT,
      ext: { isSticker: true, stickerCode: 'huanxin.biubiu' },
      timestamp: 1700000000000,
      body: { isGif: true },
    },
    marks: [],
    remindType: 'DEFAULT',
  }
}

describe('ConversationDomain 摘要重算', () => {
  it('仅更新现有会话摘要，保留本地字段和本地独有会话', () => {
    const existing: UiConversation[] = [
      {
        id: 'c1',
        name: '本地名称',
        avatar: 'https://example.com/avatar.png',
        type: CONVERSATION_TYPE.SINGLECHAT,
        unreadCount: 3,
        lastMessageText: '[亮个相吧]',
        lastMessageTime: 1700000000000,
        isPinned: true,
        pinnedTime: 123,
        isMuted: true,
        remindType: 'NONE',
        marks: [1],
        draft: '未发送草稿',
        draftTime: 456,
      },
      {
        id: 'local-only',
        name: '本地独有会话',
        type: CONVERSATION_TYPE.SINGLECHAT,
        unreadCount: 0,
        lastMessageText: '保持原样',
        isPinned: false,
        isMuted: false,
        marks: [],
      },
    ]
    const before = structuredClone(existing)
    const store: ConversationStoreLike = {
      setList: vi.fn(),
      setCurrentConversationId: vi.fn(),
      setSyncing: vi.fn(),
      delete: vi.fn(),
      update: vi.fn((id, patch) => {
        const index = existing.findIndex(item => item.id === id)
        if (index >= 0)
          existing[index] = { ...existing[index], ...patch }
      }),
      conversationList: existing,
    }
    const client = {
      chatManager: {
        getConversationList: vi.fn(() => [makeSdkConversation()]),
      },
    } as unknown as ManagerHost
    const domain = new ConversationDomain(client, store, {
      lastMessageTextResolver: () => '[Ta-da!]',
    })

    domain.refreshPreviews()

    expect(existing).toEqual([
      { ...before[0], lastMessageText: '[Ta-da!]' },
      before[1],
    ])
    expect(store.update).toHaveBeenCalledTimes(1)
    expect(store.update).toHaveBeenCalledWith('c1', { lastMessageText: '[Ta-da!]' })
    expect(store.setList).not.toHaveBeenCalled()
  })

  it('现有列表为空时不读取快照也不更新 store', () => {
    const store: ConversationStoreLike = {
      setList: vi.fn(),
      setCurrentConversationId: vi.fn(),
      setSyncing: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      conversationList: [],
    }
    const client = {
      chatManager: { getConversationList: vi.fn(() => [makeSdkConversation()]) },
    } as unknown as ManagerHost
    const domain = new ConversationDomain(client, store)

    domain.refreshPreviews()

    expect(client.chatManager.getConversationList).not.toHaveBeenCalled()
    expect(store.update).not.toHaveBeenCalled()
    expect(store.setList).not.toHaveBeenCalled()
  })
})
