import { GROUP_MEMBER_ROLE } from '@easemob-community/uikit-sdk-contract'
import { describe, expect, it, vi } from 'vitest'
import { createGroupStore } from '../../adapter/internal-stores/group'
import { GroupDomain } from '../group-domain'

function makeStore() {
  const store = createGroupStore(() => undefined)
  store.setGroupMembers('g1', [
    { userId: 'owner', role: GROUP_MEMBER_ROLE.OWNER },
    { userId: 'admin-user', role: GROUP_MEMBER_ROLE.MEMBER },
    { userId: 'previous-page-user', role: GROUP_MEMBER_ROLE.MEMBER },
  ])
  store.markGroupAdminSynced?.('g1')
  return store
}

describe('4.x 群成员分页返回值', () => {
  it('设置管理员后重新拉取首页，返回当前页合并后的角色', async () => {
    const store = makeStore()
    const client = {
      connection: {
        setGroupAdmin: vi.fn().mockResolvedValue(undefined),
        getGroupMembers: vi.fn().mockResolvedValue({
          data: {
            members: [
              { userId: 'owner', role: GROUP_MEMBER_ROLE.OWNER },
              { userId: 'admin-user', role: GROUP_MEMBER_ROLE.MEMBER },
            ],
            cursor: 'next-cursor',
          },
        }),
      },
    }
    const domain = new GroupDomain(client as never, store)

    await domain.addGroupAdmin('g1', 'admin-user')
    const result = await domain.fetchGroupMembers('g1', '', 50)

    expect(result.list.map(member => member.userId)).toEqual(['owner', 'admin-user'])
    expect(result.list.find(member => member.userId === 'admin-user')?.role).toBe(GROUP_MEMBER_ROLE.ADMIN)
    expect(result.cursor).toBe('next-cursor')
    expect(result.hasMore).toBe(true)
  })

  it('追加分页时保留缓存中的管理员角色', async () => {
    const store = makeStore()
    store.updateGroupMemberRole('g1', 'admin-user', GROUP_MEMBER_ROLE.ADMIN)
    const client = {
      connection: {
        getGroupMembers: vi.fn().mockResolvedValue({
          data: {
            members: [
              { userId: 'admin-user', role: GROUP_MEMBER_ROLE.MEMBER },
              { userId: 'next-page-user', role: GROUP_MEMBER_ROLE.MEMBER },
            ],
            cursor: undefined,
          },
        }),
      },
    }
    const domain = new GroupDomain(client as never, store)

    const result = await domain.fetchGroupMembers('g1', 'next-cursor', 50)

    expect(result.list.find(member => member.userId === 'admin-user')?.role).toBe(GROUP_MEMBER_ROLE.ADMIN)
    expect(result.list.map(member => member.userId)).toEqual(['admin-user', 'next-page-user'])
  })
})
