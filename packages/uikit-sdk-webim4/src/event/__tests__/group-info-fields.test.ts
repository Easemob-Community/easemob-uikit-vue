import { describe, expect, it, vi } from 'vitest'
import { ensureEventHandlerDeps } from '../deps'
import { createGroupHandlers } from '../group-events'

describe('4.x 群资料变更事件字段同步', () => {
  it('同步 updateInfo 增量中的 ext 和 inviteNeedConfirm，且不覆盖其他字段', () => {
    ensureEventHandlerDeps()
    const stores = {
      client: { currentUser: 'owner' },
      group: {
        getGroupById: vi.fn(() => ({ groupId: 'g1', groupName: '旧群名' })),
        updateGroup: vi.fn(),
      },
      conversation: { updateConversation: vi.fn() },
    }
    const handlers = createGroupHandlers(stores as never)

    handlers.onGroupEvent?.({
      operation: 'updateInfo',
      id: 'g1',
      detail: {
        ext: '{"from":"oa"}',
        inviteNeedConfirm: false,
      },
    } as never)

    expect(stores.group.updateGroup).toHaveBeenCalledWith('g1', {
      ext: '{"from":"oa"}',
      inviteNeedConfirm: false,
    })
  })
})
