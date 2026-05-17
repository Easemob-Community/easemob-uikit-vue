import type { Contact } from '../../store/contact'

/** 选择模式 */
export type ContactSelectMode = 'none' | 'single' | 'multiple'

/** Item 尺寸 */
export type ContactItemSize = 'compact' | 'normal' | 'large'

/** 头像形状 */
export type AvatarShape = 'circle' | 'rounded' | 'square'

/** 在线状态 */
export type OnlineStatus = 'online' | 'offline' | 'away' | 'busy'

/** 联系人列表项点击行为模式 */
export type ContactListClickBehavior = 'default' | 'event-only'

/** disabled 判定函数 */
export type ContactDisabledFn = (contact: Contact) => boolean

/** 副标题提取函数 */
export type ContactSubtitleFn = (contact: Contact) => string | undefined

/** 在线状态提取函数 */
export type ContactOnlineStatusFn = (contact: Contact) => OnlineStatus | undefined

/** 分组方式 */
export type ContactGroupBy =
  | 'none'
  | 'alphabet'
  | ((contact: Contact) => string)

/** 分组项 */
export interface ContactGroupItem {
  /** 分组 key，例如 'A'、'#' 或自定义 */
  key: string
  /** 分组标题（默认与 key 相同） */
  title: string
  /** 该组下的联系人 */
  items: Contact[]
}

/** Contact 自定义动作（右侧滑动菜单 / 右键菜单等扩展点） */
export interface ContactAction {
  /** 唯一标识 */
  key: string
  /** 显示文本 */
  label: string
  /** 图标名（icon 组件 name） */
  icon?: string
  /** 是否危险操作（红色样式） */
  danger?: boolean
}

/** 字母导航默认序列 */
export const DEFAULT_ALPHABET_KEYS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '#',
] as const

export type AlphabetKey = typeof DEFAULT_ALPHABET_KEYS[number]

/** ContactNav 入口项配置 */
export interface ContactNavEntry {
  /** 入口唯一标识 */
  key: string
  /** 入口标签文本 */
  label: string
  /** 右侧数量徽标，0 时不展示 */
  count?: number
  /** 入口图标名（icon-map 中的 name） */
  icon?: string
  /** 是否可见，false 时不渲染该卡片，默认 true */
  visible?: boolean
}
