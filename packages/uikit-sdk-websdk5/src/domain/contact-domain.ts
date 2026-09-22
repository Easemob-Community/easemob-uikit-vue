import type { ContactPage, ContactRepository, UiContact, UiContactInvite } from '@easemob-community/uikit-sdk-contract'
import type { ManagerHost } from '../client'
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

/** ContactDomain 装配选项 */
export interface ContactDomainOptions {
  /**
   * 联系人数据入口接管注入：消费 `fetchContacts`（fetchContacts 分页读委托）、
   * `fetchBlocklist`（syncBlocklist 委托）、`addContact`（添加好友动作接管，
   * 兼容旧 dataSource 语义）；其余写操作保持 SDK 直连。
   * 未注入时全部走 SDK 默认路径（行为零变化）。
   */
  contactRepository?: Partial<ContactRepository>
}

/**
 * 联系人业务域：封装 SDK ContactManager 的好友/黑名单能力。
 */
export class ContactDomain {
  constructor(
    private client: ManagerHost,
    private store: ContactStoreLike,
    private options: ContactDomainOptions = {},
  ) {}

  /** 获取当前内存中的联系人列表 */
  syncLocal(): UiContact[] {
    const items = this.client.contactManager.getContacts()
    const list = toUiContacts(items)
    this.store.setList(list)
    return list
  }

  /**
   * 分页拉取联系人列表（数据入口读路径）。
   * 注入 fetchContacts 时委托注入实现，store 写入由消费方（UI 层）按分页语义负责；
   * 未注入时回落 SDK 本地全量（syncLocal 内部写 store，无游标分页）。
   */
  async fetchContacts(cursor?: string, pageSize?: number): Promise<ContactPage> {
    const repo = this.options.contactRepository?.fetchContacts
    if (repo)
      return repo(cursor, pageSize)
    return { list: this.syncLocal(), cursor: undefined, hasMore: false }
  }

  /**
   * 只读：获取当前本地联系人数量（不写 store、不锁定 loaded）。
   * 供「轻量计数」场景使用，避免在 roster 同步完成前抢跑锁定 loaded
   * 导致 onSyncDataFinished 的回填被跳过（列表永久为空）。
   */
  getLocalCount(): number {
    return this.client.contactManager.getContacts().length
  }

  /** 添加好友（注入 addContact 时委托业务接管——业务可先登记自有系统再决定是否调 SDK） */
  async addContact(userId: string, message?: string) {
    const repo = this.options.contactRepository?.addContact
    if (repo)
      return repo(userId, message)
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

  /** 获取黑名单（注入 fetchBlocklist 时委托注入实现，结果仍写 store） */
  async syncBlocklist(): Promise<UiContact[]> {
    const repo = this.options.contactRepository?.fetchBlocklist
    if (repo) {
      const list = await repo()
      this.store.setBlocklist(list)
      return list
    }
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
