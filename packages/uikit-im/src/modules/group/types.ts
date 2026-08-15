import type { UiGroup as Group } from '@easemob/uikit-core'
import type { AvatarShape } from '../contact/types'

export type { AvatarShape }

/** 选择模式 */
export type GroupSelectMode = 'none' | 'single' | 'multiple'

/** 群组列表项点击行为模式 */
export type GroupListClickBehavior = 'default' | 'event-only'

/** Item 尺寸 */
export type GroupItemSize = 'compact' | 'normal' | 'large'

/** disabled 判定函数 */
export type GroupDisabledFn = (group: Group) => boolean

/** 副标题提取函数 */
export type GroupSubtitleFn = (group: Group) => string | undefined

/** 排序方式 */
export type GroupSortBy =
  | 'none'
  | 'pinyin'
  | 'memberCount'
  | ((a: Group, b: Group) => number)

/** 分组方式（默认 none，平铺；可选按拼音首字母分组或自定义函数） */
export type GroupGroupBy =
  | 'none'
  | 'alphabet'
  | ((group: Group) => string)

/** 分组项 */
export interface GroupGroupItem {
  /** 分组 key，例如 'A'、'#' 或自定义 */
  key: string
  /** 分组标题（默认与 key 相同） */
  title: string
  /** 该组下的群组 */
  items: Group[]
}
