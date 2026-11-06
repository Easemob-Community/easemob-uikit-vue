/** 创建复合消息分段的通用附件字段 */
export interface MultiBodyAttachmentInputBase {
  /** 本地文件；与 originalUrl 至少提供一项 */
  data?: File
  /** 已上传的远端资源地址；与 data 至少提供一项 */
  originalUrl?: string
  /** 文件名 */
  filename?: string
  /** 文件 MIME 类型 */
  filetype?: string
  /** 文件大小（字节） */
  fileLength?: number
}

/** 文本分段输入 */
export interface MultiBodyTextInput {
  type: 'text'
  content: string
  /** SDK 对复合文本段不执行发送前翻译 */
  targetLanguages?: string[]
}

/** 图片分段输入 */
export interface MultiBodyImageInput extends MultiBodyAttachmentInputBase {
  type: 'image'
  width?: number
  height?: number
  isGif?: boolean
  isOriginalImage?: boolean
  thumbnailUrl?: string
}

/** 文件分段输入 */
export interface MultiBodyFileInput extends MultiBodyAttachmentInputBase {
  type: 'file'
  fileSize?: number
}

/** 语音分段输入 */
export interface MultiBodyVoiceInput extends MultiBodyAttachmentInputBase {
  type: 'voice'
  /** 语音时长（秒） */
  duration: number
}

/** 视频分段输入 */
export interface MultiBodyVideoInput extends MultiBodyAttachmentInputBase {
  type: 'video'
  /** 视频时长（秒） */
  duration: number
  width?: number
  height?: number
  thumbnailUrl?: string
}

/** 位置分段输入 */
export interface MultiBodyLocationInput {
  type: 'location'
  latitude: number
  longitude: number
  address?: string
  buildingName?: string
}

/** 自定义分段输入 */
export interface MultiBodyCustomInput {
  type: 'custom'
  event: string
  params?: Record<string, string>
}

/** 创建复合消息的中立有序分段输入 */
export type MultiBodySegmentInput =
  | MultiBodyTextInput
  | MultiBodyImageInput
  | MultiBodyFileInput
  | MultiBodyVoiceInput
  | MultiBodyVideoInput
  | MultiBodyLocationInput
  | MultiBodyCustomInput

/** SDK 附件下载结果的中立形状 */
export interface MessageAttachmentDownloadResult {
  /** 附件文件名 */
  filename: string
  /** 附件 MIME 类型 */
  mimeType: string
  /** 附件大小（字节） */
  size?: number
  /** 实际文件内容 */
  data: Uint8Array
  /** 实际下载地址 */
  downloadUrl: string
}
