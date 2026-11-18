/** 用户资料属性名 */
export type UserInfoAttribute =
  | 'nickname'
  | 'avatarUrl'
  | 'mail'
  | 'phone'
  | 'gender'
  | 'sign'
  | 'birth'
  | 'ext'

/** 单个用户资料属性允许的值类型 */
export type UserInfoAttributeValue = string | number | boolean

/** 用户资料请求诊断选项 / Diagnostic options for user info requests. */
export interface UserInfoRequestOptions {
  /** 调用来源标签，仅用于日志聚合 / Caller label used only for log aggregation. */
  source?: string
}

/** useUserInfo 行为选项 / Behavior options for useUserInfo. */
export interface UseUserInfoOptions extends UserInfoRequestOptions {
  /** 是否订阅资料变更，默认 true / Subscribe to profile changes; defaults to true. */
  subscribe?: boolean
}

/** 中立用户资料对象（替代 SDK `UserInfo`） */
export interface UserInfo {
  /** 用户 ID */
  readonly userId: string
  /** 昵称 */
  readonly nickname?: string
  /** 头像地址 */
  readonly avatarUrl?: string
  /** 邮箱 */
  readonly mail?: string
  /** 手机号 */
  readonly phone?: string
  /** 性别或自定义标识 */
  readonly gender?: UserInfoAttributeValue
  /** 签名 */
  readonly sign?: string
  /** 生日 */
  readonly birth?: string
  /** 扩展字段 */
  readonly ext?: string
}
