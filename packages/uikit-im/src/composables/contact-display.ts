import type { UiContact } from '@easemob/uikit-core'

/**
 * 联系人展示名统一口径：备注 > 用户资料昵称 > 联系人 name。
 *
 * 与 contact-item-default / useUserInfo.displayName 的展示优先级保持一致，
 * 供搜索过滤（use-contact-filter）与字母分组（use-contact-group）消费，
 * 避免出现「界面显示昵称 A、搜索/分组却只认字段 B」的口径分裂。
 *
 * 纯函数、不读 store；nickname 由调用方从 userInfo store 解析后传入。
 */
export function resolveContactDisplayName(contact: UiContact, nickname?: string): string {
  return contact.remark || nickname || contact.name || ''
}
