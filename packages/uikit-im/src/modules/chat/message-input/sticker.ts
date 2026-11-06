import { MESSAGE_EXT_KEY } from '@easemob-community/uikit-core'
import type { EmojiStickerItem } from '@easemob-community/uikit-core'
import type { StickerExtResolver } from '../types'

export function buildStickerExt(
  sticker: EmojiStickerItem,
  packId: string,
  resolveExt?: StickerExtResolver,
) {
  return {
    [MESSAGE_EXT_KEY.IS_STICKER]: true as const,
    ...resolveExt?.(sticker, packId),
  }
}
