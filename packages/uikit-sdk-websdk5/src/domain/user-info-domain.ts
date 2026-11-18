import { createLogger } from '@easemob-community/uikit-sdk-contract'
import type { UserInfo, UserInfoAttribute, UserInfoRepository, UserInfoRequestOptions } from '@easemob-community/uikit-sdk-contract'
import type { ManagerHost } from '../client'
import type { UserInfoStoreLike } from '../event/types'
import { formatSdkError } from '../utils/sdk-error'

const logger = createLogger('UIKit:UserInfoDomain')
const USER_INFO_REQUEST_BATCH_SIZE = 100
const USER_INFO_RETRY_DELAY_MS = 300

function isRetryableFetchError(err: unknown): boolean {
  const error = err as {
    code?: number | string
    details?: { httpStatus?: number }
    httpStatus?: number
  }
  const httpStatus = error?.details?.httpStatus ?? error?.httpStatus
  if (httpStatus === 429 || (httpStatus !== undefined && httpStatus >= 500))
    return true
  if (httpStatus !== undefined)
    return false
  const code = Number(error?.code)
  if ([2, 301, 302, 303, 304].includes(code))
    return true
  if (error?.code !== undefined)
    return false
  const message = err instanceof Error ? err.message : String(err ?? '')
  return /network|failed to fetch|timeout|timed out/i.test(message)
}

function getErrorDiagnostics(err: unknown) {
  const error = err as {
    code?: number | string
    message?: string
    details?: { httpStatus?: number, reason?: string, reasonKey?: string }
    httpStatus?: number
    reason?: string
  }
  return {
    code: error?.code,
    httpStatus: error?.details?.httpStatus ?? error?.httpStatus,
    reason: error?.details?.reasonKey ?? error?.details?.reason ?? error?.reason,
    message: error?.message,
  }
}

async function requestWithRetry<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  }
  catch (err) {
    if (!isRetryableFetchError(err))
      throw err
    await new Promise(resolve => setTimeout(resolve, USER_INFO_RETRY_DELAY_MS))
    return request()
  }
}

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
  options?: UserInfoRequestOptions
  resolve: (infos: UserInfo[]) => void
}

/**
 * 用户资料业务域：封装 SDK UserInfoManager 的查询、订阅与缓存能力。
 */
export class UserInfoDomain {
  private handlerId = 'uikit-user-info'
  private subscribeQueue: { userIds: string[], options?: UserInfoRequestOptions }[] = []
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

  readCachedUserInfos(userIds: string[]): UserInfo[] {
    try {
      return this.userInfoRepository.readCachedUserInfos?.(Array.from(new Set(userIds.filter(Boolean)))) ?? []
    }
    catch {
      return []
    }
  }

  prefillUserInfos(userIds: string[]): UserInfo[] {
    const cached = this.readCachedUserInfos(userIds)
    if (cached.length === 0)
      return []
    this.store.setUserInfos(cached)
    for (const info of cached) {
      const attributes = ALL_USER_INFO_ATTRIBUTES.filter(attribute => info[attribute] !== undefined)
      if (attributes.length > 0)
        this.store.markFetchedAttributes([info.userId], attributes)
    }
    return cached
  }

  /**
   * 启动用户资料变更事件监听。应在 SDK 初始化完成后调用。
   */
  listen() {
    this.listenUserInfoChanges()
  }

  /**
   * 批量获取用户资料；已缓存（且请求属性已覆盖）或正在加载中的 userId 会被跳过。
   * 同一事件循环内的多次调用会先微任务合批，再按 100 人顺序分片（与 subscribe 合批同构）：
   * flush 时合并所有调用的 userIds（去重）与 attributes（并集），
   * 每个原始调用各自 resolve 回「自己请求的 userIds 对应的 UserInfo[]」（从 store 缓存读回）。
   * @param userIds 目标用户 ID 列表
   * @param attributes 需要查询的属性，默认全量 8 个属性
   */
  async fetchUserInfos(
    userIds: string[],
    attributes: UserInfoAttribute[] = ALL_USER_INFO_ATTRIBUTES,
    options?: UserInfoRequestOptions,
  ): Promise<UserInfo[]> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0)
      return []
    // 未连接时不发起请求，直接返回空结果（缓存数据由 store 层兜底展示）。
    // 同时把目标标记为失败：重连 onConnected 清空失败集合时，已挂载的响应式 composable
    // 会因 isFetchFailed 变化重新求值并补拉；否则离线期间挂载/滚入的条目会永久停留在 userId。
    if (!this.client.isConnected) {
      this.store.markFetchFailed(uniqueIds)
      return []
    }

    return new Promise<UserInfo[]>((resolve) => {
      this.fetchQueue.push({ userIds: uniqueIds, attributes, options, resolve })
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
      const cacheCandidates = Array.from(new Set(batch.flatMap(item => item.userIds.filter(
        id => !this.store.areAttributesFetched(id, item.attributes)
          && !this.store.isLoading(id)
          && !this.store.isFetchFailed(id),
      ))))
      const prefilledCount = this.prefillUserInfos(cacheCandidates).length
      // 预填后按各调用自身的 attributes 重算缺失：已覆盖/加载中/已失败的 id 不再请求
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
      const sources = Array.from(new Set(batch.map(item => item.options?.source ?? 'unknown')))
      const source = sources.join(',')
      let failedChunks = 0

      if (missingIds.length > 0) {
        for (let index = 0; index < missingIds.length; index += USER_INFO_REQUEST_BATCH_SIZE) {
          await this.fetchChunk(
            missingIds.slice(index, index + USER_INFO_REQUEST_BATCH_SIZE),
            attributes,
            { source },
            () => { failedChunks += 1 },
          )
        }
      }
      logger.info('[UserInfoDomain] fetch', {
        sources,
        prefilled: prefilledCount,
        requested: new Set(batch.flatMap(item => item.userIds)).size,
        missing: missingIds.length,
        chunks: Math.ceil(missingIds.length / USER_INFO_REQUEST_BATCH_SIZE),
        failedChunks,
      })

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

  private async fetchChunk(
    userIds: string[],
    attributes: UserInfoAttribute[],
    options?: UserInfoRequestOptions,
    onFailure?: () => void,
  ): Promise<UserInfo[]> {
    this.store.markLoading(userIds)
    try {
      const infos = await requestWithRetry(() => this.userInfoRepository.fetchUserInfos
        ? this.fetchFromRepository(userIds)
        : this.fetchFromSdk(userIds, attributes))
      const fetchedIds = new Set(infos.map(info => info.userId).filter(Boolean))
      const failedIds = userIds.filter(id => !fetchedIds.has(id))
      if (failedIds.length > 0)
        this.store.markFetchFailed(failedIds)
      this.store.setUserInfos(infos)
      const fetchedUserIds = userIds.filter(id => fetchedIds.has(id))
      if (fetchedUserIds.length > 0)
        this.store.markFetchedAttributes(fetchedUserIds, attributes)
      return infos
    }
    catch (err) {
      onFailure?.()
      logger.warn('[UserInfoDomain] chunk failed', {
        source: options?.source ?? 'unknown',
        chunkSize: userIds.length,
        ...getErrorDiagnostics(err),
      })
      this.store.markFetchFailed(userIds)
      return []
    }
    finally {
      this.store.markLoaded(userIds)
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
   * 同一事件循环内的多次调用先合批，再按 100 人顺序分片；
   * 若服务端返回无权限，则自动熔断后续订阅并缓存失败用户，避免重复请求与控制台警告刷屏。
   */
  async subscribeUserInfos(userIds: string[], options?: UserInfoRequestOptions): Promise<void> {
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

    this.subscribeQueue.push({ userIds: targetIds, options })

    if (this.subscribeFlushPromise)
      return this.subscribeFlushPromise

    this.subscribeFlushPromise = Promise.resolve().then(() => this.flushSubscribeQueue())
    return this.subscribeFlushPromise
  }

  private async flushSubscribeQueue(): Promise<void> {
    const batch = this.subscribeQueue
    this.subscribeQueue = []
    const userIds = Array.from(new Set(batch.flatMap(item => item.userIds)))
    const sources = Array.from(new Set(batch.map(item => item.options?.source ?? 'unknown')))
    logger.info('[UserInfoDomain] subscribe', {
      sources,
      requested: userIds.length,
      chunks: Math.ceil(userIds.length / USER_INFO_REQUEST_BATCH_SIZE),
    })

    try {
      for (let index = 0; index < userIds.length; index += USER_INFO_REQUEST_BATCH_SIZE) {
        const chunk = userIds.slice(index, index + USER_INFO_REQUEST_BATCH_SIZE)
        try {
          await this.client.userInfoManager.subscribeUsersInfo({ userIds: chunk })
          this.store.markSubscribed(chunk)
        }
        catch (err) {
          const permissionError = this.isPermissionError(err)
          this.handleSubscribeError(err, chunk)
          if (permissionError)
            break
        }
      }
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
      || e.code === 1600
      || e.details?.httpStatus === 403
      || e.details?.reason === 'service_forbidden'
  }

  /**
   * 获取当前登录用户自己的资料（默认全量属性，保证签名等登录后回显）。
   */
  async fetchOwnInfo(
    attributes: UserInfoAttribute[] = ALL_USER_INFO_ATTRIBUTES,
    options?: UserInfoRequestOptions,
  ): Promise<UserInfo | undefined> {
    const currentUserId = this.client.currentUserId
    if (!currentUserId)
      return undefined
    if (!this.client.isConnected) {
      // 与批量拉取一致：离线标记失败，重连清理后由 useOwnUserInfo 的响应式 effect 重新触发
      this.store.markFetchFailed([currentUserId])
      return this.store.getUserInfo(currentUserId)
    }
    if (!this.store.isLoading(currentUserId) && !this.store.isFetchFailed(currentUserId))
      this.prefillUserInfos([currentUserId])
    if (
      this.store.areAttributesFetched(currentUserId, attributes)
      || this.store.isLoading(currentUserId)
      || this.store.isFetchFailed(currentUserId)
    ) {
      return this.store.getUserInfo(currentUserId)
    }
    await this.fetchChunk([currentUserId], attributes, options)
    return this.store.getUserInfo(currentUserId)
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
    for (let index = 0; index < uniqueIds.length; index += USER_INFO_REQUEST_BATCH_SIZE) {
      const chunk = uniqueIds.slice(index, index + USER_INFO_REQUEST_BATCH_SIZE)
      try {
        await this.client.userInfoManager.unsubscribeUsersInfo({ userIds: chunk })
        this.store.markUnsubscribed(chunk)
      }
      catch (err) {
        logger.warn('[UserInfoDomain] unsubscribeUsersInfo failed:', formatSdkError(err))
      }
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
