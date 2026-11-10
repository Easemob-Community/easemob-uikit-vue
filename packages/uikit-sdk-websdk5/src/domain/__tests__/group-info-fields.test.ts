import { describe, expect, it, vi } from 'vitest'
import { GroupDomain } from '../group-domain'

function makeStore() {
  return {
    addGroup: vi.fn(),
    updateGroup: vi.fn(),
    getGroupById: vi.fn(),
  }
}

function makeClient() {
  const group = {
    updateInfo: vi.fn().mockResolvedValue(undefined),
    updateConfigs: vi.fn().mockResolvedValue(undefined),
  }
  return {
    groupManager: {
      createGroup: vi.fn().mockResolvedValue({ groupId: 'g1' }),
      getGroupInfo: vi.fn().mockRejectedValue(new Error('测试中跳过权威详情')),
      getGroup: vi.fn(() => group),
    },
  }
}

describe('5.x 群详情字段的本地回写', () => {
  it('创建后的本地群快照保留 inviteNeedConfirm', async () => {
    const store = makeStore()
    const domain = new GroupDomain(makeClient() as never, store as never)

    await domain.createGroup({ name: '新群', inviteNeedConfirm: true })

    expect(store.addGroup).toHaveBeenCalledWith(expect.objectContaining({
      groupId: 'g1',
      inviteNeedConfirm: true,
    }))
  })

  it('更新群资料后回写 ext', async () => {
    const store = makeStore()
    const domain = new GroupDomain(makeClient() as never, store as never)

    await domain.updateGroupInfo('g1', { ext: '{"from":"oa"}' })

    expect(store.updateGroup).toHaveBeenCalledWith('g1', { ext: '{"from":"oa"}' })
  })

  it('更新群配置后回写 inviteNeedConfirm', async () => {
    const store = makeStore()
    const domain = new GroupDomain(makeClient() as never, store as never)

    await domain.updateGroupConfigs('g1', { inviteNeedConfirm: false })

    expect(store.updateGroup).toHaveBeenCalledWith('g1', { inviteNeedConfirm: false })
  })
})
