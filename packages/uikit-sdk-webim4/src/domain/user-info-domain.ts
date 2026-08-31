import type { EasemobChat } from 'easemob-websdk'
import type {
  UserInfo,
  UserInfoAttribute,
  UserInfoAttributeValue,
  UserInfoRepository,
} from '@easemob/uikit-sdk-contract'
import { ALL_USER_INFO_ATTRIBUTES, createLogger } from '@easemob/uikit-sdk-contract'
import type { Webim4Client } from '../client'
import type { UserInfoStoreLike } from '../event/types'

const logger = createLogger('UIKit:Webim4UserInfoDomain')

/** 解包 4.x AsyncResult（data/entities 二选一承载） */
function unwrap<T>(res: EasemobChat.AsyncResult<T>): T {
  return (res?.data ?? res?.entities) as T
}

/** 中立用户资料属性 → 4.x wire 属性名（4.x 头像字段为小写 `avatarurl`） */
function toWireAttribute(attribute: UserInfoAttribute): EasemobChat.ConfigurableKey {
  return attribute === 'avatarUrl' ? 'avatarurl' : attribute
}

/** 4.x wire 用户资料 → 中立 UserInfo（`avatarurl` → `avatarUrl`） */
function fromWireUserInfo(userId: string, raw: EasemobChat.UpdateOwnUserInfoParams): UserInfo {
  return {
    userId,
    nickname: raw.nickname,
    avatarUrl: raw.avatarurl,
    mail: raw.mail,
    phone: raw.phone,
    gender: raw.gender,
    sign: raw.sign,
    birth: raw.birth,
    ext: raw.ext,
  }
}

/**
 * 用户资料业务域（4.x）：资料 API 挂单一 `connection`（无 UserInfoManager 拆分）。
 *
 * 4.24.2 能力边界（已核对 SDK 源码与类型，禁止凭记忆）：
 * - 查询 `fetchUserInfoById(userId | userId[], properties?)`、更新 `updateUserInfo(params | key, value)` 可用；
 * - **无用户资料订阅 API**（无 subscribeUsersInfo / userInfoUpdate 事件）：
 *   subscribeUserInfos 直接走熔断（标记失败 + 关闭订阅 + 触发 onSubscriptionPermissionError 回调），
 *   listen()/dispose() 无资料变更事件可挂，保留方法仅为接口对齐。
 */
export class UserInfoDomain {
  private hasLoggedPermissionError = false

  constructor(
    private client: Webim4Client,
    private store: UserInfoStoreLike,
    /**
     * 用户资料数据入口接管注入（与 websdk5 同构）：当前仅消费 `fetchUserInfos`
     * （fetchUserInfos 委托），其余方法（update 系列）保持 SDK 直连。
     * 未注入时走 SDK 默认路径。
     */
    private userInfoRepository: Partial<UserInfoRepository> = {},
    private onSubscriptionPermissionError?: () => void,
  ) {}

  private get connection() {
    const conn = this.client.connection
    if (!conn)
      throw new Error('[Webim4UserInfoDomain] connection 尚未初始化')
    return conn
  }

  /**
   * 启动用户资料变更事件监听。4.x 无资料变更事件（无 userInfoUpdate），
   * 保留 listen()/dispose() 对齐 websdk5 生命周期，调用方无需分支。
   */
  listen() {
    logger.info('[UserInfoDomain] 4.x 无用户资料变更事件，listen() 为空实现')
  }

  /**
   * 批量获取用户资料；已缓存（且请求属性已覆盖）或正在加载中的 userId 会被跳过。
   * @param userIds 目标用户 ID 列表
   * @param attributes 需要查询的属性，默认全量 8 个属性
   */
  async fetchUserInfos(
    userIds: string[],
    attributes: UserInfoAttribute[] = ALL_USER_INFO_ATTRIBUTES,
  ): Promise<UserInfo[]> {
    // 未连接时不发起请求，直接返回空结果（缓存数据由 store 层兜底展示）
    if (!this.client.isConnected) {
      return []
    }
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    const missingIds = uniqueIds.filter(
      id => !this.store.areAttributesFetched(id, attributes)
        && !this.store.isLoading(id)
        && !this.store.isFetchFailed(id),
    )

    if (missingIds.length === 0) {
      return uniqueIds.map(id => this.store.getUserInfo(id)).filter(Boolean) as UserInfo[]
    }

    this.store.markLoading(missingIds)
    try {
      const infos = this.userInfoRepository.fetchUserInfos
        ? await this.fetchFromRepository(missingIds)
        : await this.fetchFromSdk(missingIds, attributes)

      // 若请求未返回某些 userId 的数据，标记为失败，防止空结果触发无限重试
      const fetchedIds = new Set(infos.map(info => info.userId).filter(Boolean))
      const failedIds = missingIds.filter(id => !fetchedIds.has(id))
      if (failedIds.length > 0)
        this.store.markFetchFailed(failedIds)

      this.store.setUserInfos(infos)
      // 记录已请求属性，避免「已拉过部分字段」的缓存阻止后续全量补拉
      this.store.markFetchedAttributes(missingIds, attributes)
      return uniqueIds
        .map(id => this.store.getUserInfo(id))
        .filter((info): info is UserInfo => Boolean(info))
    }
    catch (err) {
      logger.warn('[UserInfoDomain] fetchUserInfos failed:', err)
      this.store.markFetchFailed(missingIds)
      return uniqueIds
        .map(id => this.store.getUserInfo(id))
        .filter((info): info is UserInfo => Boolean(info))
    }
    finally {
      this.store.markLoaded(missingIds)
    }
  }

  private async fetchFromSdk(
    userIds: string[],
    attributes: UserInfoAttribute[],
  ): Promise<UserInfo[]> {
    // 4.x properties 传空表示查询全部属性，空数组显式归一为 undefined
    const properties = attributes.length > 0 ? attributes.map(toWireAttribute) : undefined
    const res = await this.connection.fetchUserInfoById(userIds, properties)
    const data = unwrap(res) ?? {}
    return Object.entries(data).map(([userId, raw]) => fromWireUserInfo(userId, raw))
  }

  private async fetchFromRepository(userIds: string[]): Promise<UserInfo[]> {
    if (!this.userInfoRepository.fetchUserInfos)
      return []
    const result = await this.userInfoRepository.fetchUserInfos(userIds)
    // 防御性字段收敛：注入源可能携带额外字段，只保留契约九属性
    return result.map(info => ({
      userId: info.userId,
      nickname: info.nickname,
      avatarUrl: info.avatarUrl,
      mail: info.mail,
      phone: info.phone,
      gender: info.gender,
      sign: info.sign,
      birth: info.birth,
      ext: info.ext,
    }))
  }

  /**
   * 批量订阅陌生人资料变更通知。
   * 4.x 无用户资料订阅能力（已核对 4.24.2 源码）：直接熔断——标记失败、关闭订阅，
   * 并触发注入的权限错误回调（与 websdk5 无权限分支语义一致），避免上层空转重试。
   */
  async subscribeUserInfos(userIds: string[]): Promise<void> {
    if (this.store.isSubscriptionDisabled())
      return

    const targetIds = Array.from(new Set(userIds.filter(Boolean))).filter(
      id => !this.store.isSubscribed(id) && !this.store.isSubscribeFailed(id),
    )
    if (targetIds.length === 0)
      return

    this.store.markSubscribeFailed(targetIds)
    this.store.disableSubscription()
    if (!this.hasLoggedPermissionError) {
      this.hasLoggedPermissionError = true
      logger.warn(
        '[UserInfoDomain] 4.x SDK 无用户资料订阅能力，已自动关闭订阅。'
        + '陌生人资料变更将不会实时推送，拉取到的资料仍可正常展示。',
      )
      this.onSubscriptionPermissionError?.()
    }
  }

  /**
   * 获取当前登录用户自己的资料（默认全量属性，保证签名等登录后回显）。
   */
  async fetchOwnInfo(attributes: UserInfoAttribute[] = ALL_USER_INFO_ATTRIBUTES): Promise<UserInfo | undefined> {
    const currentUserId = this.client.currentUserId
    if (!currentUserId)
      return undefined
    const [info] = await this.fetchUserInfos([currentUserId], attributes)
    return info
  }

  /**
   * 更新当前登录用户资料（4.x updateUserInfo(params)，回显服务端返回的更新结果）。
   */
  async updateOwnInfo(params: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl' | 'sign' | 'ext' | 'mail' | 'phone' | 'gender' | 'birth'>>): Promise<UserInfo | undefined> {
    if (!this.client.isConnected) {
      return undefined
    }
    try {
      const wireParams: EasemobChat.UpdateOwnUserInfoParams = {
        nickname: params.nickname,
        avatarurl: params.avatarUrl,
        mail: params.mail,
        phone: params.phone,
        gender: params.gender,
        sign: params.sign,
        birth: params.birth,
        ext: params.ext,
      }
      const res = await this.connection.updateUserInfo(wireParams)
      const updated = unwrap(res) ?? wireParams
      const info = fromWireUserInfo(this.client.currentUserId, updated)
      this.store.setUserInfo(info)
      return info
    }
    catch (err) {
      logger.warn('[UserInfoDomain] updateOwnInfo failed:', err)
      return undefined
    }
  }

  /**
   * 更新当前登录用户的单个资料属性（4.x updateUserInfo(key, value)）。
   */
  async updateOwnInfoByAttribute(attribute: UserInfoAttribute, value: UserInfoAttributeValue): Promise<UserInfo | undefined> {
    if (!this.client.isConnected) {
      return undefined
    }
    try {
      // 4.x value 形参类型声明为 string；gender 允许 number/boolean，按 wire 语义透传
      const res = await this.connection.updateUserInfo(toWireAttribute(attribute), value as string)
      const updated = unwrap(res) ?? { [toWireAttribute(attribute)]: value }
      const info = fromWireUserInfo(this.client.currentUserId, updated)
      this.store.setUserInfo(info)
      return info
    }
    catch (err) {
      logger.warn('[UserInfoDomain] updateOwnInfoByAttribute failed:', err)
      return undefined
    }
  }

  /**
   * 取消订阅指定用户的资料变更通知（4.x 无订阅能力，仅清理本地标记）。
   */
  async unsubscribeUsersInfo(userIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0)
      return
    this.store.markUnsubscribed(uniqueIds)
  }

  /**
   * 获取当前用户已订阅资料变更的用户列表（4.x 无订阅能力，恒返回空）。
   */
  async getSubscribedUsers(): Promise<readonly UserInfo[]> {
    return []
  }

  /**
   * 清理事件监听与内部状态（4.x 无资料事件监听，仅复位熔断标记）。
   */
  dispose() {
    this.hasLoggedPermissionError = false
  }
}

export type { UserInfoStoreLike }
