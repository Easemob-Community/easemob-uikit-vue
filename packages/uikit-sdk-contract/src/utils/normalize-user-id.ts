/**
 * 归一化用户标识（跨场景包 / 跨 adapter 共用，中立工具）。
 *
 * Easemob SDK 中，自己其他设备发给当前设备时 `from` 为 `当前用户ID/来源设备ID`，
 * 多端登录时若直接做字符串相等比较会把己方消息误判为对方消息；
 * 另兼容历史可能的 `@appKey` / `#appKey` 后缀。
 * adapter 与 UI 层统一经本工具归一化，禁止各自实现。
 */
export function normalizeUserId(id: string): string {
  if (!id)
    return id
  // 优先处理多设备后缀 `/deviceId`，再处理历史可能的 `@appKey`/`#appKey` 后缀
  return id.split('/')[0]!.split('@')[0]!.split('#')[0]!
}

/**
 * 登录用户 ID 小写归一化：兼容后端整改期的大小写混写账号，避免登录态与消息发送者大小写不一致。
 * Normalize the login user ID to lowercase for mixed-case account compatibility during backend remediation.
 * 仅用于登录边界，不剥离设备/AppKey 后缀，也不处理 token。
 * Use only at the login boundary; do not strip device/AppKey suffixes or modify tokens.
 */
export function normalizeLoginUserId(user: string): string {
  return user.toLowerCase()
}
