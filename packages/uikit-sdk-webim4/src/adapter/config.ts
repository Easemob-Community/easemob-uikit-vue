import type { UIKitDataSource, UIKitFeatures, UserInfoRepository } from '@easemob-community/uikit-sdk-contract'

/**
 * 默认 UIKit 能力开关：adapter 独立运行或未传 features 时使用。
 * presence 默认开启（对齐 UIKit Provider 3.x 默认）：在线状态为产品化默认形态；
 * 注意订阅/查询会带来额外请求，低频场景应显式关闭。
 */
export function getDefaultFeatures(): UIKitFeatures {
  return {
    enableContact: true,
    enableBlocklist: true,
    enablePresence: true,
    presenceStrangerMode: 'query-on-visible',
    fetchGroupMemberPresenceOnVisible: true,
    contactFetchMode: 'all',
    enableGroup: true,
    enableUserInfo: true,
    enableUserInfoSubscription: true,
    enableInvitePersistence: true,
    enableDraft: true,
    enableAtMe: true,
    enableTyping: true,
    filterBlockedContacts: true,
  }
}

/**
 * 旧 dataSource 直连兼容：adapterConfig.dataSource.fetchUserInfos 收敛为
 * userInfo repository 形态（core 装配已改为 repositories 翻译注入，本路径仅供
 * 直连 adapter 的旧调用方；`SdkConfig.repositories` 注入优先）。
 * 返回类型差异（dataSource 允许部分字段）由 UserInfoDomain 的字段收敛兜底。
 */
export function legacyDataSourceToUserInfoRepository(
  ds?: UIKitDataSource,
): Partial<UserInfoRepository> | undefined {
  if (!ds?.fetchUserInfos)
    return undefined
  return { fetchUserInfos: ds.fetchUserInfos as UserInfoRepository['fetchUserInfos'] }
}
