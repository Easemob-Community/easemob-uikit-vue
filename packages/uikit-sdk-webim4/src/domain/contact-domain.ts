import type { ContactPage, ContactRepository, UiContact, UiContactInvite } from '@easemob-community/uikit-sdk-contract'
import { createLogger } from '@easemob-community/uikit-sdk-contract'
import type { Webim4Client } from '../client'
import { blocklistIdsToUiContacts, toUiContacts } from '../adapter/contact-adapter'

const contactLogger = createLogger('UIKit:Webim4ContactDomain')

/**
 * ContactStore 需要暴露给 Domain 的最小接口（在 websdk5 同构接口上
 * 增加 contactList/loaded 快照字段——4.x SDK 无本地 roster 缓存，
 * syncLocal 需读 store 快照并自行触发服务端拉取）。
 */
export interface ContactStoreLike {
  contactList: UiContact[]
  loaded: boolean
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
   * 联系人数据入口接管注入（与 websdk5 同构）：消费 `fetchContacts`
   * （fetchContacts 分页读委托）、`fetchBlocklist`（syncBlocklist 委托）、
   * `addContact`（添加好友动作接管，兼容旧 dataSource 语义）；
   * 其余写操作保持 SDK 直连。未注入时全部走 SDK 默认路径（行为零变化）。
   */
  contactRepository?: Partial<ContactRepository>
}

/**
 * 联系人业务域（4.x）：好友/黑名单能力全部挂单一 `connection`
 * （无 ContactManager 拆分，主计划 8.2）。
 *
 * 与 5.x 的关键差异：
 * - 4.x 无 roster 同步事件（无 onSyncDataFinished contact 分支），
 *   `syncLocal` 首次调用时触发一次 `getAllContacts()`（含备注）服务端拉取并回填 store；
 * - 好友申请/同意/拒绝等事件在 event/contact-events.ts 处理并写 store.invites。
 */
export class ContactDomain {
  /** 是否已完成首次服务端同步（避免 syncLocal 重复打请求） */
  private synced = false
  /** 进行中的同步 Promise（并发去重，D94 Promise 去重思路） */
  private syncing: Promise<boolean> | null = null

  constructor(
    private client: Webim4Client,
    private store: ContactStoreLike,
    private options: ContactDomainOptions = {},
  ) {}

  private get connection() {
    const conn = this.client.connection
    if (!conn)
      throw new Error('[Webim4ContactDomain] connection 尚未初始化')
    return conn
  }

  /**
   * 读取联系人列表并写入 store。
   * 4.x SDK 无本地 roster 缓存（getContacts 是服务端请求），
   * 首次调用时异步拉取全量联系人（getAllContacts 含备注）回填 store，
   * 同步返回当前 store 快照；后续调用直接返回快照。
   */
  syncLocal(): UiContact[] {
    if (!this.synced)
      void this.syncFromServer()
    return this.store.contactList
  }

  /**
   * 分页拉取联系人列表（数据入口读路径，与 websdk5 同构）。
   * 注入 fetchContacts 时委托注入实现，store 写入由消费方（UI 层）按分页语义负责；
   * 未注入时先确保服务端全量同步完成（syncFromServer），再返回 store 快照
   * （4.x 无游标分页，hasMore=false）。
   */
  async fetchContacts(cursor?: string, pageSize?: number): Promise<ContactPage> {
    const repo = this.options.contactRepository?.fetchContacts
    if (repo)
      return repo(cursor, pageSize)
    await this.syncFromServer()
    return { list: this.store.contactList, cursor: undefined, hasMore: false }
  }

  /** 只读：获取当前本地联系人数量（不写 store） */
  getLocalCount(): number {
    return this.store.contactList.length
  }

  /** 添加好友（注入 addContact 时委托业务接管——业务可先登记自有系统再决定是否调 SDK） */
  async addContact(userId: string, message?: string) {
    const repo = this.options.contactRepository?.addContact
    if (repo)
      return repo(userId, message)
    await this.connection.addContact(userId, message || '')
  }

  /**
   * 删除好友。
   * 4.x 本端删除后无事件回推（onContactDeleted 仅对方设备收到），成功后本地移除。
   */
  async deleteContact(userId: string) {
    await this.connection.deleteContact(userId)
    this.store.removeContact(userId)
    this.store.removeInvite(userId)
  }

  /** 设置好友备注 */
  async setRemark(userId: string, remark: string) {
    await this.connection.setContactRemark({ userId, remark })
    this.store.updateRemark(userId, remark)
  }

  /** 接受好友申请（4.x acceptContactInvite；旧名 acceptInvitation 已 deprecated） */
  async acceptInvite(userId: string) {
    await this.connection.acceptContactInvite(userId)
    this.store.removeInvite(userId)
  }

  /** 拒绝好友申请（4.x declineContactInvite；旧名 declineInvitation 已 deprecated） */
  async declineInvite(userId: string) {
    await this.connection.declineContactInvite(userId)
    this.store.removeInvite(userId)
  }

  /** 获取黑名单（4.x getBlocklist 仅返回用户 ID 列表；注入 fetchBlocklist 时委托注入实现，结果仍写 store） */
  async syncBlocklist(): Promise<UiContact[]> {
    const repo = this.options.contactRepository?.fetchBlocklist
    if (repo) {
      const list = await repo()
      this.store.setBlocklist(list)
      return list
    }
    const res = await this.connection.getBlocklist()
    const list = blocklistIdsToUiContacts(res.data || [])
    this.store.setBlocklist(list)
    return list
  }

  /** 批量加入黑名单 */
  async addToBlocklist(userIds: string[]) {
    await this.connection.addUsersToBlocklist({ name: userIds })
  }

  /** 批量移出黑名单 */
  async removeFromBlocklist(userIds: string[]) {
    await this.connection.removeUserFromBlocklist({ name: userIds })
  }

  /**
   * 从服务端拉取全量联系人并回填 store（并发去重；失败不锁定 synced，允许下次重试）。
   * 使用 getAllContacts（needReturnRemark=true）而非仅返回 ID 列表的旧版 getContacts()。
   * 返回是否拉取成功（adapter 登录后预取据此上报中立同步状态）。
   */
  async syncFromServer(): Promise<boolean> {
    if (this.syncing)
      return this.syncing
    this.syncing = (async () => {
      try {
        const res = await this.connection.getAllContacts()
        const list = toUiContacts(res.data || [])
        this.store.setList(list)
        this.synced = true
        contactLogger.info('contact 服务端回填', { count: list.length })
        return true
      }
      catch (err) {
        contactLogger.warn('getAllContacts 失败:', err)
        return false
      }
      finally {
        this.syncing = null
      }
    })()
    return this.syncing
  }
}
