import { describe, expect, it } from 'vitest'
import { resolveAlphabetKeyByOffsetY } from '../alphabet-nav.utils'

const KEYS = ['A', 'B', 'C', 'D', 'E'] as const

/**
 * 字母索引条触摸滑动映射测试：
 * - 触点按纵向占比均匀映射到字母序列
 * - 越界触点钳制到首/末字母（手指滑出索引条仍命中边缘字母）
 * - 空序列 / 非法高度安全返回 null
 */
describe('resolveAlphabetKeyByOffsetY', () => {
  it('按纵向占比均匀映射', () => {
    // 容器 100px、5 个字母：每 20px 一档
    expect(resolveAlphabetKeyByOffsetY(0, 100, KEYS)).toBe('A')
    expect(resolveAlphabetKeyByOffsetY(19.9, 100, KEYS)).toBe('A')
    expect(resolveAlphabetKeyByOffsetY(20, 100, KEYS)).toBe('B')
    expect(resolveAlphabetKeyByOffsetY(50, 100, KEYS)).toBe('C')
    expect(resolveAlphabetKeyByOffsetY(99.9, 100, KEYS)).toBe('E')
  })

  it('越界触点钳制到首/末字母', () => {
    expect(resolveAlphabetKeyByOffsetY(-10, 100, KEYS)).toBe('A')
    expect(resolveAlphabetKeyByOffsetY(120, 100, KEYS)).toBe('E')
  })

  it('空序列或非法高度返回 null', () => {
    expect(resolveAlphabetKeyByOffsetY(10, 100, [])).toBeNull()
    expect(resolveAlphabetKeyByOffsetY(10, 0, KEYS)).toBeNull()
    expect(resolveAlphabetKeyByOffsetY(10, -5, KEYS)).toBeNull()
  })

  it('单字母序列任意触点都命中该字母', () => {
    expect(resolveAlphabetKeyByOffsetY(0, 100, ['#'])).toBe('#')
    expect(resolveAlphabetKeyByOffsetY(999, 100, ['#'])).toBe('#')
  })
})
