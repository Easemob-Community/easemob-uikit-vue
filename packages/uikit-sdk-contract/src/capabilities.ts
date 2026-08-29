/**
 * SDK 客观能力矩阵，由各 adapter 如实上报；uikit-im 按 capabilities 分支渲染/隐藏。
 * 与 Provider 的 `features`（业务开关）取交集决定最终是否展示。
 *
 * 说明（基于 4.24.2 源码核对）：合并消息 / 置顶消息 / 流式消息 / 已读回执 两代 SDK 均支持，
 * 能力上无缺失；差异在字段映射与语义（详见主计划「八、4.x 能力映射」）。
 * 因此本矩阵是「极少数真实能力差异的显式声明 + 未来新增能力的扩展位」，而非 4.x 降级开关。
 */
export interface SdkCapabilities {
  combineMessage: boolean
  pinnedMessage: boolean
  streamingMessage: boolean
  groupReadReceipt: boolean
  // TODO 按需扩充（reaction / thread / translation / voiceToText 等二期能力）
}
