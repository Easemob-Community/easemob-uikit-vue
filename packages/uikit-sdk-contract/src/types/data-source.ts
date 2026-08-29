import type { UserInfo } from './user-info'
import type { CreateGroupParams, UiGroup } from './group'
import type { UiContact } from './contact'
import type { UiPresence } from './presence'

/**
 * 业务可插拔的数据源适配器。
 * 不传任意一项 -> 走 SDK 默认实现。
 * 传入 -> 业务接管该接口的数据获取/订阅。
 *
 * 注：主计划 2.5 已明确旧 UIKitDataSource 将迁移为 repository 数据入口层；
 * 本接口目前保持与旧签名兼容，供 adapter / core / UIKit 过渡使用。
 */
export interface UIKitDataSource {
  fetchContacts?: (params?: { cursor?: string, pageSize?: number }) => Promise<{ list: UiContact[], cursor?: string, hasMore?: boolean }>
  fetchBlocklist?: () => Promise<UiContact[]>
  fetchGroups?: (params: { cursor?: string, pageSize?: number }) => Promise<{ list: UiGroup[], cursor?: string, hasMore?: boolean }>
  fetchPresence?: (userIds: string[]) => Promise<UiPresence[]>
  subscribePresence?: (userIds: string[]) => Promise<void> | void
  unsubscribePresence?: (userIds: string[]) => Promise<void> | void
  /** 业务自定义用户资料源；返回数组至少包含 userId，可选 nickname/avatarUrl/sign/mail/phone/gender/birth/ext */
  fetchUserInfos?: (userIds: string[]) => Promise<Array<Pick<UserInfo, 'userId' | 'nickname' | 'avatarUrl' | 'mail' | 'phone' | 'gender' | 'sign' | 'birth' | 'ext'>>>
  /**
   * 服务端搜索用户：按手机号/邮箱/昵称等业务字段查询环信 userId。
   * 不传时添加联系人组件退化为直接输入 userId 添加。
   * Business-side user search: map phone/email/etc. to Easemob userId.
   */
  searchUsers?: (keyword: string) => Promise<UiContact[]>
  /**
   * 业务接管添加好友动作（可先登记自有业务系统，再调用 SDK 添加）。
   * 不传时走 SDK contactManager.addContact 默认实现。
   * Business takeover of add-contact action; falls back to SDK by default.
   */
  addContact?: (userId: string, message?: string) => Promise<void>
  /**
   * 业务接管创建群组动作（可先登记自有业务系统，再调用 SDK 创建）。
   * 不传时走 SDK groupManager.createGroup 默认实现。
   * Business takeover of create-group action; falls back to SDK by default.
   */
  createGroup?: (params: CreateGroupParams) => Promise<{ groupId: string }>
}
