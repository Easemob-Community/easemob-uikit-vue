import { describe, expect, it } from 'vitest'
import { safeSerializeLogArgs } from '../log-store'

describe('safeSerializeLogArgs', () => {
  it('空参数返回 undefined', () => {
    expect(safeSerializeLogArgs([])).toBeUndefined()
  })

  it('数组透传：数组套对象的元素露出顶层标量字段，深层对象压平 [Deep]', () => {
    const text = safeSerializeLogArgs([{
      conversationId: 'pfh',
      raw: {
        items: [
          { msgServerId: 'm1', type: 'image', from: 'a', to: 'b', body: { url: 'http://x' } },
          { msgServerId: 'm2', type: 'text', body: { content: 'hi' } },
        ],
        hasMore: true,
      },
    }])!
    const parsed = JSON.parse(text)[0]
    // items 在对象深度 2，数组透传后元素按深度 2 展开（< 3），顶层字段可见
    expect(parsed.raw.items[0].msgServerId).toBe('m1')
    expect(parsed.raw.items[0].type).toBe('image')
    expect(parsed.raw.items[0].from).toBe('a')
    expect(parsed.raw.items[1].msgServerId).toBe('m2')
    // body 落在深度 3，对象层级压平
    expect(parsed.raw.items[0].body).toBe('[Deep]')
    expect(parsed.raw.hasMore).toBe(true)
  })

  it('纯数组嵌套超 MAX_ARRAY_DEPTH 后压平 [Array(n)]，深数组不栈溢出', () => {
    const deep: unknown[] = []
    let cur = deep
    for (let i = 0; i < 100; i++) {
      const next: unknown[] = []
      cur.push(next)
      cur = next
    }
    const text = safeSerializeLogArgs([deep])!
    expect(text).toContain('[Array(1)]')
  })

  it('超过 MAX_SERIALIZE_DEPTH 的对象层级压平 [Deep]', () => {
    const text = safeSerializeLogArgs([{ a: { b: { c: { d: 1 } } } }])!
    const parsed = JSON.parse(text)[0]
    expect(parsed.a.b.c).toBe('[Deep]')
  })

  it('长字符串字段逐字段截断，其余字段不受影响', () => {
    const long = 'x'.repeat(500)
    const text = safeSerializeLogArgs([{ short: 'keep', long, tail: 'end' }])!
    const parsed = JSON.parse(text)[0]
    expect(parsed.short).toBe('keep')
    expect(parsed.tail).toBe('end')
    expect(parsed.long.length).toBe(201)
    expect(parsed.long.endsWith('…')).toBe(true)
  })

  it('循环引用兜底 [Circular]', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    const text = safeSerializeLogArgs([a])!
    expect(text).toContain('[Circular]')
  })

  it('单条总长超 2KB 截断并标记', () => {
    // 逐字段截断后单字段已合规，用多个字段凑超 2KB 总预算
    const big: Record<string, string> = {}
    for (let i = 0; i < 30; i++)
      big[`f${i}`] = 'y'.repeat(300)
    const text = safeSerializeLogArgs([big])!
    expect(text.length).toBeLessThanOrEqual(2048 + '…(truncated)'.length)
    expect(text.endsWith('…(truncated)')).toBe(true)
  })

  it('Error 提取 name/message', () => {
    const text = safeSerializeLogArgs([new TypeError('bad')])!
    const parsed = JSON.parse(text)[0]
    expect(parsed.name).toBe('TypeError')
    expect(parsed.message).toBe('bad')
  })
})
