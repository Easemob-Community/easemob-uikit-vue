import { describe, expect, it } from 'vitest'
import { patchPbMetaDecode } from '../patch-pb-decode'
import type { PbPatchableConnection } from '../patch-pb-decode'

function makeConn(decodeImpl: (...args: unknown[]) => unknown) {
  const metaType: { decode: (...args: unknown[]) => unknown, __webim4TolerantDecode?: boolean } = { decode: decodeImpl }
  const conn: PbPatchableConnection = {
    root: {
      lookup: (path: string) => (path === 'easemob.pb.Meta' ? metaType : undefined),
    },
  }
  return { conn, metaType }
}

describe('patchPbMetaDecode（4.x pb Meta 解码容错）', () => {
  it('解码正常时原样透传返回值', () => {
    const { conn, metaType } = makeConn(() => ({ ns: 1, id: 1 }))
    patchPbMetaDecode(conn)
    expect(metaType.decode([1, 2, 3])).toEqual({ ns: 1, id: 1 })
  })

  it('解码抛错时返回 ns=-1 桩对象而不是抛出', () => {
    const { conn, metaType } = makeConn(() => {
      throw new Error('invalid wire type 7 at offset 114')
    })
    patchPbMetaDecode(conn)
    expect(() => metaType.decode([1, 2, 3])).not.toThrow()
    expect(metaType.decode([1, 2, 3])).toEqual({ ns: -1 })
  })

  it('补丁幂等：重复 patch 不会多层包装', () => {
    let calls = 0
    const { conn, metaType } = makeConn(() => {
      calls++
      return { ns: 1 }
    })
    patchPbMetaDecode(conn)
    patchPbMetaDecode(conn)
    metaType.decode([])
    expect(calls).toBe(1)
    expect(metaType.__webim4TolerantDecode).toBe(true)
  })

  it('conn 无 root/lookup 时不抛错（降级为原生行为）', () => {
    expect(() => patchPbMetaDecode({})).not.toThrow()
    expect(() => patchPbMetaDecode({ root: {} })).not.toThrow()
  })
})
