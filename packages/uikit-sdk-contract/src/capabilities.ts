/**
 * SDK 客观能力矩阵，由各 adapter 如实上报；uikit-im 按 capabilities 分支渲染/隐藏。
 * 与 Provider 的 `features`（业务开关）取交集决定最终是否展示。
 *
 * 说明（基于 4.24.2 源码核对）：合并消息 / 置顶消息 / 流式消息 / 已读回执 两代 SDK 均支持，
 * 能力上无缺失；差异在字段映射与语义（详见主计划「八、4.x 能力映射」）。
 * 因此本矩阵是「极少数真实能力差异的显式声明 + 未来新增能力的扩展位」，而非 4.x 降级开关。
 */

/** 能力位（boolean 映射）：true = 该 adapter 背后的 SDK 支持此能力 */
export interface SdkCapabilityFlags {
  combineMessage: boolean
  pinnedMessage: boolean
  streamingMessage: boolean
  groupReadReceipt: boolean
  // TODO 按需扩充（reaction / thread / translation / voiceToText 等二期能力）
}

/** 能力位名称 */
export type SdkCapabilityKey = keyof SdkCapabilityFlags

/** 单项能力的协商元信息（可选） */
export interface SdkCapabilityMeta {
  /** 能力为 false 或语义与契约默认有差异时的原因说明 */
  reason?: string
  /** 消费该能力语义所需的最低契约版本（对齐 SDK_CONTRACT_VERSION） */
  minContractVersion?: string
}

/**
 * SDK 能力上报 = 能力位 + 可选协商元信息。
 * 能力位保持 boolean 映射；协商元信息全部可选，仅在未来出现真实差异/版本演进时填写。
 */
export interface SdkCapabilities extends SdkCapabilityFlags {
  /** adapter 实现所遵循的契约版本；缺省视为当前 `SDK_CONTRACT_VERSION` */
  contractVersion?: string
  /** 各能力位的可选协商元信息（能力为 false 时建议填 `reason`） */
  meta?: Partial<Record<SdkCapabilityKey, SdkCapabilityMeta>>
}

/**
 * 契约版本：契约包发生 breaking 变更（接口签名/类型形状/语义）时递增。
 * adapter 经 `SdkCapabilities.contractVersion` 上报自己遵循的契约版本，
 * 消费方可据此做版本协商（当前未发版阶段仅作机制口子，无强制校验）。
 */
export const SDK_CONTRACT_VERSION = '1.0.0'
