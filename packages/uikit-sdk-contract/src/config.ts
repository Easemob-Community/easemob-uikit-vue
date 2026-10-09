import type { SdkPersistenceHooks } from './persistence'
import type { SdkRepositoryOverrides } from './repository'

/** 中立初始化配置，只含 SDK 无关字段 */
export interface SdkConfig {
  /**
   * 应用 AppKey（`org#app` 格式）。与 `appId` 二选一，至少提供其一。
   * Application AppKey (`org#app`). Mutually exclusive with `appId`; at least one is required.
   */
  appKey?: string
  /**
   * 应用 App ID（SDK 5.1+ 支持；与 `appKey` 二选一。appId 模式经 DNSConfig 解析 AppKey，
   * 不可配置固定 serverUrls；webim4 / SDK 4.x 不支持，仅传 appId 时 webim4 会抛错）。
   * Application App ID (SDK 5.1+; mutually exclusive with `appKey`). App ID mode resolves
   * the AppKey via DNSConfig and cannot use fixed serverUrls; webim4 (SDK 4.x) does not
   * support it and throws when only `appId` is provided.
   */
  appId?: string
  /** 用户 ID：延迟初始化场景可在 login 时再提供 */
  userId?: string
  /** Token：延迟初始化场景可在 login 时再提供 */
  token?: string
  debug?: boolean
  /**
   * 登录超时时间（毫秒），缺省用 SDK 默认（30s）。仅 websdk5（SDK 5.1.2+）生效，webim4 忽略。
   * Login timeout in milliseconds; SDK default (30s) applies when omitted.
   * Only honored by the websdk5 adapter (SDK 5.1.2+); ignored by webim4.
   */
  loginTimeoutMs?: number
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
   * 旁路持久化钩子注入（Electron 本地库 SQLite 专项留口子）。
   * 与 `repositories` 的区别：`repositories` 是数据入口接管（替换 SDK 读路径），
   * `persistence` 是旁路写库（SDK 行为不变，收发事件后 fire-and-forget 同步给本地库）。
   * 两套接口互斥语义、可同时注入（写库 + 读路径接管由实现方自行组合）。
   * Bypass-persistence hook injection (Electron local SQLite). Unlike `repositories`
   * (data-source takeover replacing SDK read paths), `persistence` is side-channel
   * write-only: SDK behavior unchanged, fire-and-forget sync after events.
   */
  persistence?: SdkPersistenceHooks
  /**
   * SDK 特定配置透传槽：现有 `sdkConfig` 的 `enableSyncData`/`deviceId`/
   * `enableUserInfoSync`/`managers`（chatroom 的 ChatRoomManager 注入也走这里）等
   * 字段经此透传给 adapter.init，不进中立契约约束（详见主计划决策 15）。
   */
  adapterConfig?: Record<string, unknown>
}
