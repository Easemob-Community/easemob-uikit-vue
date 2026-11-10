import { describe, expect, it, vi } from 'vitest'
import { ensureEventHandlerDeps } from '../deps'
import { createGroupHandlers } from '../group-events'

describe('5.x 群资料变更事件字段同步', () => {
  it('同步完整群详情中的扩展字段和群配置', () => {
    ensureEventHandlerDeps()
    const stores = {
      group: {
        getGroupById: vi.fn(() => ({ groupId: 'g1', groupName: '旧群名' })),
        updateGroup: vi.fn(),
      },
      conversation: { updateConversation: vi.fn() },
    }
    const handlers = createGroupHandlers(stores as never)

    handlers.onGroupInfoChanged?.({
      groupId: 'g1',
      groupInfo: {
        groupId: 'g1',
        name: '旧群名',
        ext: '{"from":"oa"}',
        inviteNeedConfirm: true,
        joinedAt: 1700000000000,
        public: true,
        joinApprovalRequired: true,
        allowInvites: false,
        maxMembers: 500,
      },
    } as never)

    expect(stores.group.updateGroup).toHaveBeenCalledWith('g1', expect.objectContaining({
      ext: '{"from":"oa"}',
      inviteNeedConfirm: true,
      joinedAt: 1700000000000,
      public: true,
      approval: true,
      allowInvites: false,
      maxUsers: 500,
    }))
  })

  it('旧版顶层稀疏载荷按增量更新，不清空未提供的缓存字段', () => {
    ensureEventHandlerDeps()
    const existing = {
      groupId: 'g1',
      groupName: '旧群名',
      memberCount: 12,
      public: true,
      allowInvites: false,
      approval: true,
      maxUsers: 100,
    }
    const stores = {
      group: {
        getGroupById: vi.fn(() => existing),
        updateGroup: vi.fn((_groupId: string, patch) => Object.assign(existing, patch)),
      },
      conversation: { updateConversation: vi.fn() },
    }
    const handlers = createGroupHandlers(stores as never)

    handlers.onGroupInfoChanged?.({
      groupId: 'g1',
      groupName: '新群名',
      avatar: 'new-avatar.png',
    } as never)

    expect(stores.group.updateGroup).toHaveBeenCalledWith('g1', {
      groupId: 'g1',
      groupName: '新群名',
      avatar: 'new-avatar.png',
    })
    expect(existing).toMatchObject({
      groupName: '新群名',
      avatar: 'new-avatar.png',
      memberCount: 12,
      public: true,
      allowInvites: false,
      approval: true,
      maxUsers: 100,
    })
  })
})
