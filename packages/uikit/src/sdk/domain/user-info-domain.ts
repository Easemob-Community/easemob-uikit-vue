import type { UserInfo, UserInfoAttribute } from 'easemob-websdk'
import type { ManagerHost } from '../client'
import type { UserInfoStore } from '../../store/user-info'
import type { UIKitDataSource } from '../../composables/types'
import { formatSdkError } from '../../utils/sdk-error'
import { createLogger } from '../../utils/logger'

const logger = createLogger('UIKit:UserInfoDomain')

/**
 * 用户资料业务域：封装 SDK UserInfoManager 的查询、订阅与缓存能力。
 */
export class UserInfoDomain {
  private handlerId = 'uikit-user-info'
  private subscribeQueue: string[] = []
  private subscribeFlushPromise: Promise<void> | null = null
  private hasLoggedPermissionError = false

  constructor(
    private client: ManagerHost,
    private store: UserInfoStore,
    private dataSource: UIKitDataSource = {},
    private onSubscriptionPermissionError?: () => void,
  ) {}

  /**
   * 启动用户资料变更事件监听。应在 SDK 初始化完成后调用。
   */
  listen() {
    this.listenUserInfoChanges()
  }

  /**
   * 批量获取用户资料；已缓存或正在加载中的 userId 会被跳过。
   * @param userIds 目标用户 ID 列表
   * @param attributes 需要查询的属性，默认只查 nickname/avatarUrl
   */
  async fetchUserInfos(
    userIds: string[],
    attributes: UserInfoAttribute[] = ['nickname', 'avatarUrl'],
  ): Promise<UserInfo[]> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    const missingIds = uniqueIds.filter(
      id => !this.store.getUserInfo(id) && !this.store.isLoading(id) && !this.store.isFetchFailed(id),
    )

    if (missingIds.length === 0) {
      return uniqueIds.map(id => this.store.getUserInfo(id)).filter(Boolean) as UserInfo[]
    }

    this.store.markLoading(missingIds)
    try {
      const infos = this.dataSource.fetchUserInfos
        ? await this.fetchFromDataSource(missingIds)
        : await this.fetchFromSdk(missingIds, attributes)

      // 若请求未返回某些 userId 的数据，标记为失败，防止空结果触发无限重试
      const fetchedIds = new Set(infos.map(info => info.userId).filter(Boolean))
      const failedIds = missingIds.filter(id => !fetchedIds.has(id))
      if (failedIds.length > 0)
        this.store.markFetchFailed(failedIds)

      this.store.setUserInfos(infos)
      return uniqueIds
        .map(id => this.store.getUserInfo(id))
        .filter((info): info is UserInfo => Boolean(info))
    }
    catch (err) {
      logger.warn('[UserInfoDomain] fetchUserInfos failed:', formatSdkError(err))
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
    const result = await this.client.userInfoManager.getUserInfoByAttribute({
      userIds,
      attributes,
    })
    return Array.from(result)
  }

  private async fetchFromDataSource(userIds: string[]): Promise<UserInfo[]> {
    if (!this.dataSource.fetchUserInfos)
      return []
    const result = await this.dataSource.fetchUserInfos(userIds)
    return result.map(info => ({
      userId: info.userId,
      nickname: info.nickname,
      avatarUrl: info.avatarUrl,
      sign: info.sign,
      ext: info.ext,
    }))
  }

  /**
   * 批量订阅陌生人资料变更通知。
   * 同一事件循环内的多次调用会合并为一次 SDK 请求；
   * 若服务端返回无权限，则自动熔断后续订阅并缓存失败用户，避免重复请求与控制台警告刷屏。
   */
  async subscribeUserInfos(userIds: string[]): Promise<void> {
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
   * 获取当前登录用户自己的资料。
   */
  async fetchOwnInfo(attributes: UserInfoAttribute[] = ['nickname', 'avatarUrl']): Promise<UserInfo | undefined> {
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
  async getSubscribedUsers() {
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

export type { UserInfoStore }
