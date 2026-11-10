import type { GroupDetail, JoinedGroupSummary } from 'easemob-websdk'
import { describe, expect, it } from 'vitest'
import { toUiGroup } from './group-adapter'

describe('toUiGroup（5.x 群详情扩展字段）', () => {
  it('保留群详情的 ext、inviteNeedConfirm 和 joinedAt', () => {
    const detail: GroupDetail = {
      groupId: 'g1',
      name: '测试群',
      ext: '{"from":"oa"}',
      inviteNeedConfirm: true,
      joinedAt: 1700000000000,
    }

    expect(toUiGroup(detail)).toMatchObject({
      groupId: 'g1',
      ext: '{"from":"oa"}',
      inviteNeedConfirm: true,
      joinedAt: 1700000000000,
    })
  })

  it('保留本地已加入群摘要的 joinedAt', () => {
    const summary: JoinedGroupSummary = {
      groupId: 'g2',
      name: '摘要群',
      joinedAt: 1700000000001,
    }

    expect(toUiGroup(summary).joinedAt).toBe(1700000000001)
  })
})
