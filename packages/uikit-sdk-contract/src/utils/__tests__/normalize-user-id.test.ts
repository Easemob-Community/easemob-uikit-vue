import { describe, expect, it } from 'vitest'
import { normalizeLoginUserId, normalizeUserId } from '../normalize-user-id'

describe('normalizeLoginUserId', () => {
  it.each([
    ['UserA', 'usera'],
    ['USERA', 'usera'],
    ['usera', 'usera'],
    ['', ''],
  ])('将登录用户 ID %j 归一化为 %j', (input, expected) => {
    expect(normalizeLoginUserId(input)).toBe(expected)
  })
})

describe('normalizeUserId', () => {
  it('只剥离多设备后缀，不改变原有大小写', () => {
    expect(normalizeUserId('UserA/device')).toBe('UserA')
  })
})
