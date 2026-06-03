import type { ClientCore } from './index'

/**
 * 好友/黑名单相关 API 服务
 */
export class ContactService {
  constructor(private core: ClientCore) {}

  /** 获取全部好友列表（轻量，仅 userId） */
  getContacts() {
    return this.core.contactManager.getContacts()
  }

  /** 分页获取好友列表（含备注） */
  async getContactsWithCursor(
    options?: {
      pageSize?: number
      cursor?: string
    },
  ) {
    /**
     * @see SDK_DEFICIENCY: ContactManager 未暴露 getContactsWithCursor 方法，
     * 仅提供 getContacts() 返回内存中的完整联系人列表。
     * 此处保留占位实现以维持 UIKit 分页接口兼容性。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.core.contactManager as any).getContactsWithCursor?.({
      pageSize: options?.pageSize ?? 50,
      cursor: options?.cursor ?? '',
    })
  }

  /** 添加好友 */
  async addContact(userId: string, reason?: string) {
    return this.core.contactManager.addContact({
      userId,
      message: reason ?? '',
    })
  }

  /** 删除好友 */
  async deleteContact(userId: string) {
    return this.core.contactManager.deleteContact({ userId })
  }

  /** 设置好友备注 */
  async setContactRemark(userId: string, remark: string) {
    return this.core.contactManager.setContactRemark({ userId, remark })
  }

  // ========== 黑名单 ==========
  /** 获取黑名单 */
  getBlocklist() {
    return this.core.contactManager.getBlocklist()
  }

  /** 加入黑名单 */
  async addUsersToBlocklist(userIds: string[]) {
    return this.core.contactManager.addUsersToBlocklist({ userIds })
  }

  /** 移出黑名单 */
  async removeUserFromBlocklist(userId: string) {
    return this.core.contactManager.removeUserFromBlocklist({ userIds: [userId] })
  }
}
