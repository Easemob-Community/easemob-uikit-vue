import type {
  ManagerHost,
} from '../client'
import type { UserInfoStore } from '../../store/user-info'
import type { UserInfo, UserInfoAttribute } from 'easemob-websdk'
import type { UIKitDataSource } from '../../composables/types'

/**
 * 用户资料业务域：封装 SDK UserInfoManager 的查询、订阅与缓存能力。
 */
export class UserInfoDomain {
  private handlerId = 'uikit-user-info'

  constructor(
    private client: ManagerHost,
    private store: UserInfoStore,
    private dataSource: UIKitDataSource = {},
  ) {
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
      id => !this.store.getUserInfo(id) && !this.store.isLoading(id),
    )

    if (missingIds.length === 0) {
      return uniqueIds.map(id => this.store.getUserInfo(id)).filter(Boolean) as UserInfo[]
    }

    this.store.markLoading(missingIds)
    try {
      const infos = this.dataSource.fetchUserInfos
        ? await this.fetchFromDataSource(missingIds)
        : await this.fetchFromSdk(missingIds, attributes)
      this.store.setUserInfos(infos)
      return uniqueIds
        .map(id => this.store.getUserInfo(id))
        .filter((info): info is UserInfo => Boolean(info))
    }
    catch (err) {
      console.warn('[UserInfoDomain] fetchUserInfos failed:', err)
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
   */
  async subscribeUserInfos(userIds: string[]): Promise<void> {
    const unsubscribedIds = Array.from(new Set(userIds.filter(Boolean))).filter(
      id => !this.store.isSubscribed(id),
    )
    if (unsubscribedIds.length === 0)
      return

    try {
      await this.client.userInfoManager.subscribeUsersInfo({ userIds: unsubscribedIds })
      this.store.markSubscribed(unsubscribedIds)
    }
    catch (err) {
      console.warn('[UserInfoDomain] subscribeUserInfos failed:', err)
    }
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
      console.warn('[UserInfoDomain] updateOwnInfo failed:', err)
      return undefined
    }
  }

  /**
   * 清理事件监听。
   */
  dispose() {
    this.client.userInfoManager.removeEventHandler(this.handlerId)
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
