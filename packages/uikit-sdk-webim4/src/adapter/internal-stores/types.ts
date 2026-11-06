import type { SdkEventHandlers, SdkMessage } from '@easemob-community/uikit-sdk-contract'

/** 内部消息类型：SDK 消息 + UIKit 扩展字段 */
export type SdkUiMessage = SdkMessage & {
  recalled?: boolean
  recalledBy?: string
  status?: string
  pinned?: boolean
  pinTime?: number
  pinOperatorId?: string
  translation?: { text: string, to: string }
  showTranslation?: boolean
  translating?: boolean
  voiceText?: { text: string }
  showVoiceText?: boolean
  voiceTranscribing?: boolean
  progress?: number
  failReason?: string
  modified?: boolean
}

/** 事件处理器引用类型 */
export type HandlersRef = () => SdkEventHandlers | undefined

/** 内置 client store 所需的最小宿主状态，避免反向依赖具体 adapter 类 */
export interface InternalStoreHost {
  readonly currentUserId: string
}
