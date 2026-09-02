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
