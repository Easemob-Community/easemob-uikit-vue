import type { EasemobChat } from 'easemob-websdk-4'
import { describe, expect, it } from 'vitest'
import { toUiGroup } from '../group-adapter'

describe('toUiGroup（4.x 群组字段映射）', () => {
  it('映射 GroupDetailInfo（下划线字段，含 affiliations_count）为完整群组', () => {
    const detail = {
      id: 'g1',
      name: '测试群',
      owner: 'user1',
      affiliations_count: 42,
      maxusers: 200,
      membersonly: true,
      public: true,
      allowinvites: false,
    } as EasemobChat.GroupDetailInfo
    const group = toUiGroup(detail)
    expect(group.groupId).toBe('g1')
    expect(group.groupName).toBe('测试群')
    expect(group.memberCount).toBe(42)
    expect(group.maxUsers).toBe(200)
    expect(group.approval).toBe(true)
  })

  it('仅有 id/name 的详情响应（4.x 服务裁剪字段）也能识别为 GroupDetailInfo', () => {
    // 回归：旧判别只认 affiliations_count/maxusers，裁剪字段后会静默产出空 groupName
    const detail = { id: 'g2', name: '裁剪群' } as EasemobChat.GroupDetailInfo
    const group = toUiGroup(detail)
    expect(group.groupId).toBe('g2')
    expect(group.groupName).toBe('裁剪群')
  })

  it('映射 GroupInfo（camelCase，getJoinedGroups + needRole/needAffiliations）并保留角色', () => {
    const info = {
      groupId: 'g3',
      groupName: '已加入群',
      role: 'admin',
      affiliationsCount: 10,
    } as unknown as EasemobChat.GroupInfo
    const group = toUiGroup(info)
    expect(group.groupId).toBe('g3')
    expect(group.groupName).toBe('已加入群')
    expect(group.role).toBe('admin')
    expect(group.memberCount).toBe(10)
  })

  it('映射 BaseGroupInfo（仅 groupid/groupname）为最小群组', () => {
    const base = { groupid: 'g4', groupname: '基础群' } as EasemobChat.BaseGroupInfo
    const group = toUiGroup(base)
    expect(group.groupId).toBe('g4')
    expect(group.groupName).toBe('基础群')
  })

  it('无法识别的字段形状 → 告警且不抛错（产出空群组由调用方重试兜底）', () => {
    const weird = { foo: 'bar' } as unknown as EasemobChat.BaseGroupInfo
    const group = toUiGroup(weird)
    expect(group.groupId).toBeUndefined()
    expect(group.groupName).toBeUndefined()
  })
})
