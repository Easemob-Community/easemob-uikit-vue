import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MessageInputDraft } from '../../modules/chat/message-input/input-draft'
import { clearAllDrafts, initDraftStorage, isDraftPreviewUrlRetained, useConversation } from '../use-conversation'

const mocks = vi.hoisted(() => ({
  updateConversation: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}))

vi.mock('@easemob-community/uikit-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@easemob-community/uikit-core')>()
  return {
    ...actual,
    getStorageBackend: () => ({
      getItem: mocks.getItem,
      setItem: mocks.setItem,
      removeItem: mocks.removeItem,
    }),
  }
})

vi.mock('../use-uikit', () => ({
  useUIKit: () => ({
    domains: {},
    features: { enableDraft: true },
    stores: {
      client: { appKey: 'app-key', currentUser: 'current-user' },
      conversation: {
        sortedConversationList: [],
        currentConversation: null,
        isSyncingConversations: false,
        hasMoreConversations: false,
        updateConversation: mocks.updateConversation,
      },
    },
  }),
}))

function snapshotDraft(text = '哇达哇'): MessageInputDraft {
  return {
    text,
    preview: `[图片]${text}`,
    snapshot: {
      mode: 'simple',
      text,
      attachments: [
        {
          id: 'image-1',
          type: MESSAGE_TYPE.IMAGE,
          file: new File(['content'], 'photo.png', { type: 'image/png' }),
          previewUrl: 'blob:image-1',
          position: 0,
        },
        {
          id: 'image-2',
          type: MESSAGE_TYPE.IMAGE,
          file: new File(['content'], 'second.png', { type: 'image/png' }),
          previewUrl: 'blob:image-2',
          position: 1,
        },
      ],
      mentionList: [],
    },
  }
}

beforeEach(() => {
  clearAllDrafts()
  initDraftStorage('none')
  vi.clearAllMocks()
  mocks.getItem.mockReturnValue(null)
})

describe('conversation input drafts', () => {
  it('keeps legacy string APIs while exposing a full snapshot and preview', () => {
    const conversation = useConversation()
    conversation.saveDraft('c1', 'legacy')

    expect(conversation.loadDraft('c1')).toBe('legacy')
    expect(mocks.updateConversation).toHaveBeenLastCalledWith('c1', {
      draft: 'legacy',
      draftTime: expect.any(Number),
    })

    conversation.saveInputDraft('c1', snapshotDraft())

    expect(conversation.loadDraft('c1')).toBe('哇达哇')
    expect(conversation.loadInputDraft('c1')).toMatchObject({
      text: '哇达哇',
      preview: '[图片]哇达哇',
      snapshot: { mode: 'simple' },
    })
    expect(mocks.updateConversation).toHaveBeenLastCalledWith('c1', {
      draft: '[图片]哇达哇',
      draftTime: expect.any(Number),
    })
  })

  it('persists only text and hydrates storage drafts without phantom attachments', () => {
    initDraftStorage('local')
    const conversation = useConversation()
    conversation.saveInputDraft('c1', snapshotDraft())

    const persisted = JSON.parse(mocks.setItem.mock.calls[0]![1] as string) as Record<string, unknown>
    expect(persisted).toEqual({ text: '哇达哇', time: expect.any(Number) })
    expect(persisted).not.toHaveProperty('preview')
    expect(persisted).not.toHaveProperty('snapshot')

    clearAllDrafts()
    mocks.getItem.mockReturnValue(JSON.stringify(persisted))
    const restored = conversation.loadInputDraft('c1')

    expect(restored).toEqual({ text: '哇达哇', preview: '哇达哇', time: persisted.time })
    expect(restored).not.toHaveProperty('snapshot')
  })

  it('revokes only URLs removed when replacing a cached snapshot', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const conversation = useConversation()
    conversation.saveInputDraft('c1', snapshotDraft())

    const next = snapshotDraft()
    if (next.snapshot?.mode === 'simple')
      next.snapshot.attachments.shift()
    conversation.saveInputDraft('c1', next)

    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1')
  })

  it('tracks retained URLs and revokes them on clear or logout cleanup', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const conversation = useConversation()
    conversation.saveInputDraft('c1', snapshotDraft())

    expect(isDraftPreviewUrlRetained('blob:image-1')).toBe(true)
    expect(isDraftPreviewUrlRetained('blob:unknown')).toBe(false)

    conversation.clearDraft('c1')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-1')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-2')
    expect(isDraftPreviewUrlRetained('blob:image-1')).toBe(false)
  })
})
