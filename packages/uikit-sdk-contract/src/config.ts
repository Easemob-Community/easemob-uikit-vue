/** 中立初始化配置，只含 SDK 无关字段 */
export interface SdkConfig {
  appKey: string
  /** 用户 ID：延迟初始化场景可在 login 时再提供 */
  userId?: string
  /** Token：延迟初始化场景可在 login 时再提供 */
  token?: string
  debug?: boolean
  /**
   * SDK 特定配置透传槽：现有 `sdkConfig` 的 `enableSyncData`/`deviceId`/
   * `enableUserInfoSync`/`managers`（chatroom 的 ChatRoomManager 注入也走这里）等
   * 字段经此透传给 adapter.init，不进中立契约约束（详见主计划决策 15）。
   */
  adapterConfig?: Record<string, unknown>
}
