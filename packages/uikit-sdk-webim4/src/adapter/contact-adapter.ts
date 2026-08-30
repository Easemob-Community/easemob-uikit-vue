import type { EasemobChat } from 'easemob-websdk'
import type { UiContact } from '@easemob/uikit-sdk-contract'

/**
 * 将 4.x ContactItem（getAllContacts / getContactsWithCursor 返回，含 userId + remark）
 * 转换为中立 UiContact。
 *
 * 注意：4.x 旧版 `getContacts()` 仅返回 userId 列表（无备注），adapter 主链路使用
 * `getAllContacts()`（needReturnRemark=true）以拿到备注；昵称/头像等资料由
 * 用户资料域（fetchUserInfoById）另行补全，不在此处展开。
 */
export function toUiContact(item: EasemobChat.ContactItem): UiContact {
  return {
    userId: item.userId,
    name: item.remark || item.userId,
    remark: item.remark || undefined,
  }
}

/** 批量转换 4.x 联系人 */
export function toUiContacts(items: readonly EasemobChat.ContactItem[]): UiContact[] {
  return items.map(item => toUiContact(item))
}

/** 黑名单用户 ID 列表（getBlocklist 仅返回 ID）→ UiContact */
export function blocklistIdsToUiContacts(userIds: readonly string[]): UiContact[] {
  return userIds.map(userId => ({ userId, name: userId }))
}
