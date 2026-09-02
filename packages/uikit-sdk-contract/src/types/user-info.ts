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
