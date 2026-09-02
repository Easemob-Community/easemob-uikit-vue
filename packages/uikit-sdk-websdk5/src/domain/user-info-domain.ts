import { createLogger } from '@easemob/uikit-sdk-contract'
import type { UserInfo, UserInfoAttribute, UserInfoRepository } from '@easemob/uikit-sdk-contract'
import type { ManagerHost } from '../client'
import type { UserInfoStoreLike } from '../event/types'
import { formatSdkError } from '../utils/sdk-error'

const logger = createLogger('UIKit:UserInfoDomain')

/**
 * 用户资料全部可查属性（SDK UserInfoAttribute 全集）。
 * 登录/自身资料默认全量拉取，保证昵称、头像、签名、邮箱、手机号等登录后均可回显；
 * 场景列表类轻量消费可显式传子集（如 ['nickname', 'avatarUrl']）减少带宽。
 */
export const ALL_USER_INFO_ATTRIBUTES: UserInfoAttribute[] = [
  'nickname',
  'avatarUrl',
  'mail',
  'phone',
  'gender',
  'sign',
  'birth',
  'ext',
]

/** fetch 合批队列条目：一次原始调用携带的 userIds/attributes 与结果回调 */
interface FetchQueueItem {
  userIds: string[]
  attributes: UserInfoAttribute[]
  resolve: (infos: UserInfo[]) => void
}

/**
 * 用户资料业务域：封装 SDK UserInfoManager 的查询、订阅与缓存能力。
 */
export class UserInfoDomain {
  private handlerId = 'uikit-user-info'
  private subscribeQueue: string[] = []
  private subscribeFlushPromise: Promise<void> | null = null
  private fetchQueue: FetchQueueItem[] = []
  private fetchFlushPromise: Promise<void> | null = null
  private hasLoggedPermissionError = false

  constructor(
    private client: ManagerHost,
    private store: UserInfoStoreLike,
    /**
     * 用户资料数据入口接管注入：当前仅消费 `fetchUserInfos`（fetchUserInfos 委托），
     * 其余方法（update/subscribe 系列）保持 SDK 直连。未注入时走 SDK 默认路径。
     */
    private userInfoRepository: Partial<UserInfoRepository> = {},
    private onSubscriptionPermissionError?: () => void,
  ) {}

  /**
   * 启动用户资料变更事件监听。应在 SDK 初始化完成后调用。
   */
  listen() {
    this.listenUserInfoChanges()
  }

  /**
   * 批量获取用户资料；已缓存（且请求属性已覆盖）或正在加载中的 userId 会被跳过。
   * 同一事件循环内的多次调用会合批为一次底层请求（微任务 flush，与 subscribe 合批同构）：
   * flush 时合并所有调用的 userIds（去重）与 attributes（并集），只发一次请求，
   * 每个原始调用各自 resolve 回「自己请求的 userIds 对应的 UserInfo[]」（从 store 缓存读回）。
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
    if (uniqueIds.length === 0)
      return []

    return new Promise<UserInfo[]>((resolve) => {
      this.fetchQueue.push({ userIds: uniqueIds, attributes, resolve })
      this.scheduleFetchFlush()
    })
  }

  private scheduleFetchFlush(): void {
    if (this.fetchFlushPromise)
      return
    this.fetchFlushPromise = Promise.resolve().then(() => this.flushFetchQueue())
  }

  private async flushFetchQueue(): Promise<void> {
    const batch = this.fetchQueue
    this.fetchQueue = []
    try {
      // 合并前先按各调用自身的 attributes 过滤：已覆盖/加载中/已失败的 id 不再请求
      const pending = batch.map(item => ({
        ...item,
        missingIds: item.userIds.filter(
          id => !this.store.areAttributesFetched(id, item.attributes)
            && !this.store.isLoading(id)
            && !this.store.isFetchFailed(id),
        ),
      }))
      const missingIds = Array.from(new Set(pending.flatMap(item => item.missingIds)))
      // 各调用 attributes 取并集，一次请求覆盖各方所需字段
      const attributes = Array.from(new Set(batch.flatMap(item => item.attributes)))

      if (missingIds.length > 0) {
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
        }
        catch (err) {
          logger.warn('[UserInfoDomain] fetchUserInfos failed:', formatSdkError(err))
          this.store.markFetchFailed(missingIds)
        }
        finally {
          this.store.markLoaded(missingIds)
        }
      }

      // 每个原始调用各自 resolve：从 store 缓存读回自己请求的 userIds 子集
      for (const item of pending) {
        item.resolve(
          item.userIds
            .map(id => this.store.getUserInfo(id))
            .filter((info): info is UserInfo => Boolean(info)),
        )
      }
    }
    finally {
      this.fetchFlushPromise = null
      // flush 进行中新 push 进队列的调用不会再触发后续 flush，这里补排一轮避免滞留
      if (this.fetchQueue.length > 0)
        this.scheduleFetchFlush()
    }
  }

  private async fetchFromSdk(
    userIds: string[],
    attributes: UserInfoAttribute[],
  ): Promise<UserInfo[]> {
    const result = await this.client.userInfoManager.getUserInfoByAttribute({
      userIds,
      attributes,
    })
    return Array.from(result)
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
   * 同一事件循环内的多次调用会合并为一次 SDK 请求；
   * 若服务端返回无权限，则自动熔断后续订阅并缓存失败用户，避免重复请求与控制台警告刷屏。
   */
  async subscribeUserInfos(userIds: string[]): Promise<void> {
    if (!this.client.isConnected) {
      return
    }
    if (this.store.isSubscriptionDisabled())
      return

    const targetIds = Array.from(new Set(userIds.filter(Boolean))).filter(
      id => !this.store.isSubscribed(id) && !this.store.isSubscribeFailed(id),
    )
    if (targetIds.length === 0)
      return

    this.subscribeQueue.push(...targetIds)

    if (this.subscribeFlushPromise)
      return this.subscribeFlushPromise

    this.subscribeFlushPromise = Promise.resolve().then(() => this.flushSubscribeQueue())
    return this.subscribeFlushPromise
  }

  private async flushSubscribeQueue(): Promise<void> {
    const userIds = Array.from(new Set(this.subscribeQueue))
    this.subscribeQueue = []

    try {
      await this.client.userInfoManager.subscribeUsersInfo({ userIds })
      this.store.markSubscribed(userIds)
    }
    catch (err) {
      this.handleSubscribeError(err, userIds)
    }
    finally {
      this.subscribeFlushPromise = null
      // flush 进行中新 push 进队列的 id 不会再触发后续 flush，这里补排一轮避免滞留
      if (this.subscribeQueue.length > 0) {
        this.subscribeFlushPromise = Promise.resolve().then(() => this.flushSubscribeQueue())
      }
    }
  }

  private handleSubscribeError(err: unknown, userIds: string[]): void {
    if (this.isPermissionError(err)) {
      this.store.markSubscribeFailed(userIds)
      this.store.disableSubscription()
      if (!this.hasLoggedPermissionError) {
        this.hasLoggedPermissionError = true
        logger.warn(
          '[UserInfoDomain] 用户资料订阅无权限或服务未开通，已自动关闭订阅。'
          + '后续陌生人资料变更将不会实时推送，拉取到的资料仍可正常展示。',
          formatSdkError(err),
        )
        this.onSubscriptionPermissionError?.()
      }
      return
    }

    this.store.markSubscribeFailed(userIds)
    logger.warn('[UserInfoDomain] subscribeUserInfos failed:', formatSdkError(err))
  }

  private isPermissionError(err: unknown): boolean {
    if (!err || typeof err !== 'object')
      return false
    const e = err as {
      code?: number | string
      details?: { httpStatus?: number, reason?: string }
    }
    return e.code === 210
      || e.details?.httpStatus === 403
      || e.details?.reason === 'service_forbidden'
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
   * 更新当前登录用户资料。
   */
  async updateOwnInfo(params: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl' | 'sign' | 'ext' | 'mail' | 'phone' | 'gender' | 'birth'>>): Promise<UserInfo | undefined> {
    if (!this.client.isConnected) {
      return undefined
    }
    try {
      const info = await this.client.userInfoManager.updateOwnInfo(params)
      this.store.setUserInfo(info)
      return info
    }
    catch (err) {
      logger.warn('[UserInfoDomain] updateOwnInfo failed:', formatSdkError(err))
      return undefined
    }
  }

  /**
   * 更新当前登录用户的单个资料属性。
   */
  async updateOwnInfoByAttribute(attribute: UserInfoAttribute, value: string | number | boolean): Promise<UserInfo | undefined> {
    if (!this.client.isConnected) {
      return undefined
    }
    try {
      const info = await this.client.userInfoManager.updateOwnInfoByAttribute(attribute, value)
      this.store.setUserInfo(info)
      return info
    }
    catch (err) {
      logger.warn('[UserInfoDomain] updateOwnInfoByAttribute failed:', formatSdkError(err))
      return undefined
    }
  }

  /**
   * 取消订阅指定用户的资料变更通知。
   */
  async unsubscribeUsersInfo(userIds: string[]): Promise<void> {
    if (!this.client.isConnected) {
      return
    }
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0)
      return
    try {
      await this.client.userInfoManager.unsubscribeUsersInfo({ userIds: uniqueIds })
      this.store.markUnsubscribed(uniqueIds)
    }
    catch (err) {
      logger.warn('[UserInfoDomain] unsubscribeUsersInfo failed:', formatSdkError(err))
    }
  }

  /**
   * 获取当前用户已订阅资料变更的用户列表。
   */
  async getSubscribedUsers(): Promise<readonly UserInfo[]> {
    if (!this.client.isConnected) {
      return []
    }
    try {
      return await this.client.userInfoManager.getSubscribedUsers()
    }
    catch (err) {
      logger.warn('[UserInfoDomain] getSubscribedUsers failed:', formatSdkError(err))
      return []
    }
  }

  /**
   * 清理事件监听与内部状态。
   */
  dispose() {
    this.client.userInfoManager.removeEventHandler(this.handlerId)
    this.subscribeQueue = []
    this.subscribeFlushPromise = null
    // 滞留队列条目 resolve 缓存子集后清空，避免调用方 Promise 悬挂
    const pendingFetch = this.fetchQueue
    this.fetchQueue = []
    this.fetchFlushPromise = null
    for (const item of pendingFetch) {
      item.resolve(
        item.userIds
          .map(id => this.store.getUserInfo(id))
          .filter((info): info is UserInfo => Boolean(info)),
      )
    }
    this.hasLoggedPermissionError = false
  }

  private listenUserInfoChanges() {
    this.client.userInfoManager.addEventHandler(this.handlerId, {
      onOwnInfoUpdated: (userInfo) => {
        this.store.setUserInfo(userInfo)
      },
      onUserInfoUpdated: (userInfos) => {
        this.store.setUserInfos(Array.from(userInfos))
      },
    })
  }
}

export type { UserInfoStoreLike }
