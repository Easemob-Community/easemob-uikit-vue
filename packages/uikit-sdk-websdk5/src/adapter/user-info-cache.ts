import type { UserInfo } from '@easemob-community/uikit-sdk-contract'
import type { UIKitClient } from '../client'

type CachedUserInfo = Partial<Omit<UserInfo, 'userId'>> & { userId: string }

interface SdkUserInfoCacheManager {
  getRuntimeUserInfo?: (userId: string, updateAccess: boolean) => CachedUserInfo | null
  getUserInfoSummaries?: (userIds: string[], updateAccess: boolean) => readonly CachedUserInfo[]
}

function compactUserInfo(raw: CachedUserInfo): UserInfo {
  return Object.fromEntries(
    Object.entries({
      userId: raw.userId,
      nickname: raw.nickname,
      avatarUrl: raw.avatarUrl,
      mail: raw.mail,
      phone: raw.phone,
      gender: raw.gender,
      sign: raw.sign,
      birth: raw.birth,
      ext: raw.ext,
    }).filter(([, value]) => value !== undefined),
  ) as unknown as UserInfo
}

/**
 * 读取 SDK internal 本地资料；任何版本差异都降级为空缓存。
 * 版本 floor：`easemob-websdk` >= 5.0.0（`getCacheManager().getRuntimeUserInfo` /
 * `getUserInfoSummaries` 自 5.0.0 起可用）；内部 API 改名/移除时整段 try/catch 回退 REST。
 */
export function readSdkCachedUserInfos(client: UIKitClient, userIds: string[]): UserInfo[] {
  try {
    const cacheManager = client.getCacheManager() as SdkUserInfoCacheManager | null
    if (!cacheManager)
      return []
    const remainingIds: string[] = []
    const runtimeById = new Map<string, CachedUserInfo>()
    for (const userId of userIds) {
      const runtime = cacheManager.getRuntimeUserInfo?.(userId, false)
      if (runtime)
        runtimeById.set(userId, { ...runtime, userId })
      else
        remainingIds.push(userId)
    }
    const summaryById = new Map(
      (cacheManager.getUserInfoSummaries?.(remainingIds, false) ?? []).map(info => [info.userId, info]),
    )
    return userIds
      .map(userId => runtimeById.get(userId) ?? summaryById.get(userId))
      .filter((info): info is CachedUserInfo => Boolean(info))
      .map(compactUserInfo)
  }
  catch {
    return []
  }
}
