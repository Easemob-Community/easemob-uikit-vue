/**
 * 表情包（sticker）单项 / Sticker item in a pack
 */
export interface EmojiStickerItem {
  /** 包内唯一 key / Unique key within the pack */
  key: string
  /** 图片 URL，支持 gif/png/webp / Image URL, supports gif/png/webp */
  url: string
  /** 缩略图 URL（可选，列表加载更快）/ Optional thumbnail URL for faster list loading */
  thumbUrl?: string
  /** 名称/无障碍 label（可选）/ Optional name or a11y label */
  name?: string
}

/**
 * 表情包（sticker pack）/ A pack of image stickers (e.g. GIF)
 */
export interface EmojiStickerPack {
  /** 包唯一 id / Unique pack id */
  id: string
  /** tab 展示名 / Tab display name */
  name: string
  /** tab 图标 URL（可选，优先于 name 文字）/ Optional tab icon URL, preferred over name text */
  iconUrl?: string
  /** 包内表情列表 / Stickers in this pack */
  stickers: EmojiStickerItem[]
}
