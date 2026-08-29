/** UIKit 联系人展示类型 */
export interface UiContact {
  /** 用户 ID */
  userId: string
  /** 显示名（备注优先） */
  name?: string
  /** 头像 */
  avatar?: string
  /** 备注 */
  remark?: string
  /** 签名 */
  signature?: string
  /** 性别 */
  gender?: string
  /** 生日 */
  birth?: string
  /** 电话 */
  phone?: string
  /** 邮箱 */
  mail?: string
  /** 扩展 */
  ext?: Record<string, unknown>
}

/** UIKit 好友申请 / 群组邀请展示类型 */
export interface UiContactInvite {
  /** 唯一标识（好友申请取 userId，群组邀请取 groupId） */
  id: string
  /** 通知类型：好友申请 / 群组邀请 */
  type: 'contact' | 'group'
  /** 申请人/被邀请人用户 ID（好友申请时为申请人） */
  userId?: string
  /** 申请人/对方昵称 */
  nickname?: string
  /** 申请人/对方头像 */
  avatarUrl?: string
  /** 申请/邀请附言 */
  reason?: string
  /** 群组 ID（仅群组邀请） */
  groupId?: string
  /** 群组名称（仅群组邀请） */
  groupName?: string
  /** 邀请人用户 ID（仅群组邀请） */
  inviterId?: string
  /** 邀请人昵称（仅群组邀请） */
  inviterName?: string
  /** 申请/邀请状态 */
  status: 'pending' | 'accepted' | 'declined'
  /** 申请/邀请时间戳 */
  timestamp?: number
}
