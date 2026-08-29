import type { ManagerHost } from '../client'
import type { UiContact, UiContactInvite } from '@easemob/uikit-sdk-contract'
import { toUiContacts } from '../adapter/contact-adapter'

/**
 * ContactStore 需要暴露给 Domain 的最小接口。
 */
export interface ContactStoreLike {
  setList: (list: UiContact[]) => void
  addContact: (contact: UiContact) => void
  removeContact: (userId: string) => void
  updateRemark: (userId: string, remark: string) => void
  setBlocklist: (list: UiContact[]) => void
  addInvite: (invite: UiContactInvite) => void
  removeInvite: (id: string) => void
  updateInviteStatus: (id: string, status: UiContactInvite['status']) => void
}

/**
 * 联系人业务域：封装 SDK ContactManager 的好友/黑名单能力。
 */
export class ContactDomain {
  constructor(
    private client: ManagerHost,
    private store: ContactStoreLike,
  ) {}

  /** 获取当前内存中的联系人列表 */
  syncLocal(): UiContact[] {
    const items = this.client.contactManager.getContacts()
    const list = toUiContacts(items)
    this.store.setList(list)
    return list
  }

  /**
   * 只读：获取当前本地联系人数量（不写 store、不锁定 loaded）。
   * 供「轻量计数」场景使用，避免在 roster 同步完成前抢跑锁定 loaded
   * 导致 onSyncDataFinished 的回填被跳过（列表永久为空）。
   */
  getLocalCount(): number {
    return this.client.contactManager.getContacts().length
  }

  /** 添加好友 */
  async addContact(userId: string, message?: string) {
    await this.client.contactManager.addContact({
      userId,
      message: message || '',
    })
  }

  /** 删除好友 */
  async deleteContact(userId: string) {
    await this.client.contactManager.deleteContact({ userId })
  }

  /** 设置好友备注 */
  async setRemark(userId: string, remark: string) {
    await this.client.contactManager.setContactRemark({ userId, remark })
    this.store.updateRemark(userId, remark)
  }

  /** 接受好友申请 */
  async acceptInvite(userId: string) {
    await this.client.contactManager.acceptContactInvite({ userId })
    this.store.removeInvite(userId)
  }

  /** 拒绝好友申请 */
  async declineInvite(userId: string) {
    await this.client.contactManager.declineContactInvite({ userId })
    this.store.removeInvite(userId)
  }

  /** 获取黑名单 */
  async syncBlocklist(): Promise<UiContact[]> {
    const list = await this.client.contactManager.getBlocklist()
    const uiList = toUiContacts(list)
    this.store.setBlocklist(uiList)
    return uiList
  }

  /** 批量加入黑名单 */
  async addToBlocklist(userIds: string[]) {
    await this.client.contactManager.addUsersToBlocklist({ userIds })
  }

  /** 批量移出黑名单 */
  async removeFromBlocklist(userIds: string[]) {
    await this.client.contactManager.removeUserFromBlocklist({ userIds })
  }
}
