// 消息摘要 / 显示名解析工具已下沉：
// - customEventPreviewMap / formatConversationPreview / defaultLastMessageTextResolver /
//   resolveLastMessageText / LastMessageTextResolver → @easemob/uikit-sdk-contract
// - resolveUserDisplayName / resolveSenderDisplayName → @easemob/uikit-sdk-websdk5
// 此处 re-export 保持 im 既有导入路径（'../utils/resolve-last-message-text'）兼容。
export {
  customEventPreviewMap,
  defaultLastMessageTextResolver,
  formatConversationPreview,
  resolveLastMessageText,
} from '@easemob/uikit-sdk-contract'
export type { LastMessageTextResolver } from '@easemob/uikit-sdk-contract'
export {
  resolveSenderDisplayName,
  resolveUserDisplayName,
} from '@easemob/uikit-sdk-websdk5'
