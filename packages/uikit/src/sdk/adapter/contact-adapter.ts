import type { Contact as SdkContact, UserInfo as SdkUserInfo } from 'easemob-websdk'
import type { UiContact } from '../types'

/**
 * 将 SDK Contact 或 UserInfo 转换为 UIKit 联系人展示类型。
 */
export function toUiContact(source: SdkContact | SdkUserInfo): UiContact {
  if ('userId' in source && source.userId !== undefined) {
    const contact = source as SdkContact
    return {
      userId: contact.userId,
      name: contact.remark || contact.userId,
      remark: contact.remark,
    }
  }

  const userInfo = source as SdkUserInfo
  return {
    userId: userInfo.userId,
    name: userInfo.nickname || userInfo.userId,
    avatar: userInfo.avatarUrl,
    remark: userInfo.nickname,
    signature: userInfo.sign,
    gender: userInfo.gender != null ? String(userInfo.gender) : undefined,
    birth: userInfo.birth,
    phone: userInfo.phone,
    mail: userInfo.mail,
    ext: parseUserInfoExt(userInfo.ext),
  }
}

/** 解析 SDK UserInfo 的 ext（JSON 字符串）为对象，失败时返回 undefined */
function parseUserInfoExt(ext: string | undefined): Record<string, unknown> | undefined {
  if (!ext)
    return undefined
  try {
    const parsed = JSON.parse(ext)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined
  }
  catch {
    return undefined
  }
}

/** 批量转换 SDK 联系人 */
export function toUiContacts(sources: readonly (SdkContact | SdkUserInfo)[]): UiContact[] {
  return sources.map(source => toUiContact(source))
}
