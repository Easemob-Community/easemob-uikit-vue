import { describe, expect, it } from 'vitest'
import { buildStickerExt } from './sticker'

const sticker = {
  key: 'OKDK',
  name: '好的收到',
  url: 'https://example.com/OKDK.gif',
}

describe('buildStickerExt', () => {
  it('默认仅携带通用 isSticker 标记，不生成业务编码', () => {
    expect(buildStickerExt(sticker, 'huanxin')).toEqual({
      isSticker: true,
    })
  })

  it('将表情和 packId 交给业务扩展并合并返回字段', () => {
    expect(buildStickerExt(sticker, 'huanxin', (item, packId) => ({
      stickerCode: `${packId}.${item.key}`,
      demoField: 'reserved',
    }))).toEqual({
      isSticker: true,
      stickerCode: 'huanxin.OKDK',
      demoField: 'reserved',
    })
  })
})
