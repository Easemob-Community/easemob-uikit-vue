import type { SdkRepositoryOverrides } from './repository'

/** 中立初始化配置，只含 SDK 无关字段 */
export interface SdkConfig {
  appKey: string
  /** 用户 ID：延迟初始化场景可在 login 时再提供 */
  userId?: string
  /** Token：延迟初始化场景可在 login 时再提供 */
  token?: string
  debug?: boolean
  /**
   * 数据入口接管注入（Phase 3.1 留口子）。core 归一化（normalizeInitConfig）
   * 会把本字段随其它平铺字段下沉进 adapterConfig；websdk5 / webim4 两 adapter
   * 的 init 均按 `config.repositories ?? adapterCfg.repositories` 读取。
   * Repository override injection (Phase 3.1 seam). core normalization sinks
   * this field (with other flat fields) into adapterConfig; both adapters read
   * it as `config.repositories ?? adapterCfg.repositories`.
   */
  repositories?: SdkRepositoryOverrides
  /**
   * SDK 特定配置透传槽：现有 `sdkConfig` 的 `enableSyncData`/`deviceId`/
   * `enableUserInfoSync`/`managers`（chatroom 的 ChatRoomManager 注入也走这里）等
   * 字段经此透传给 adapter.init，不进中立契约约束（详见主计划决策 15）。
   */
  adapterConfig?: Record<string, unknown>
}
