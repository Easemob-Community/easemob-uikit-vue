import type { Message } from '../../store/message'

/** 消息气泡布局模式 */
export type MessageLayout = 'left' | 'conversation'

/** 消息气泡形状 */
export type BubbleShape = 'round' | 'square'

/** Header 对齐方式 */
export type HeaderAlign = 'left' | 'center' | 'right'

/** 输入框模式 */
export type InputMode = 'simple' | 'rich'

/** 输入框风格 */
export type InputStyle = 'feishu' | 'wechat'

/** 加载历史消息模式 */
export type LoadHistoryMode = 'pull-down' | 'scroll-top' | 'auto'

/** 时间显示策略 */
export type TimeDisplayStrategy = boolean | 'always' | 'hover'

/** 聊天页面全局配置 */
export interface ChatConfig {
  /** Header 配置 */
  header?: {
    /** 是否显示 header，默认 true */
    visible?: boolean
    /** 标题对齐方式，默认 'center' */
    align?: HeaderAlign
    /** 是否启用自定义插槽，默认 false */
    customSlot?: boolean
    /** 是否显示头像，默认 false */
    showAvatar?: boolean
  }
  /** 消息列表配置 */
  messageList?: {
    /** 消息布局模式，默认 'conversation' */
    layout?: MessageLayout
    /** 是否显示头像，默认 true */
    showAvatar?: boolean
    /** 时间显示策略，默认 'always' */
    showTime?: TimeDisplayStrategy
    /** 气泡形状，默认 'round' */
    bubbleShape?: BubbleShape
    /** 时间分组间隔（毫秒），默认 5 分钟 */
    groupInterval?: number
    /** 虚拟滚动阈值，超过该消息数启用虚拟滚动，默认 100 */
    virtualScrollThreshold?: number
    /** 加载历史消息配置 */
    loadHistory?: {
      /** 是否启用历史消息加载，默认 true */
      enable?: boolean
      /** 加载模式，默认 'auto'（自动适配端型） */
      mode?: LoadHistoryMode
    }
  }
  /** 消息操作配置 */
  messageAction?: {
    /** 启用引用，默认 true */
    enableQuote?: boolean
    /** 启用复制，默认 true */
    enableCopy?: boolean
    /** 启用删除，默认 true */
    enableDelete?: boolean
    /** 启用撤回，默认 true */
    enableRecall?: boolean
    /** 启用转发，默认 true */
    enableForward?: boolean
    /** 启用多选，默认 true */
    enableMultiSelect?: boolean
    /** 启用翻译，默认 false */
    enableTranslate?: boolean
    /** 启用置顶，默认 false */
    enablePin?: boolean
    /** 撤回禁用时长（毫秒），超过该时长后无法撤回，默认 2 分钟（120000） */
    recallDisableDuration?: number
  }
  /** 群已读回执配置 */
  groupReadReceipt?: {
    /** 是否启用群已读回执，默认 false */
    enabled?: boolean
    /** 群人数上限，默认 200（超过此人数不发已读回执） */
    maxGroupSize?: number
  }
  /** 输入框配置 */
  input?: {
    /** 输入框模式，默认 'simple' */
    mode?: InputMode
    /** 输入框风格，默认 'wechat' */
    style?: InputStyle
    /** 功能开关 */
    features?: {
      /** Emoji，默认 true */
      emoji?: boolean
      /** 图片，默认 true */
      image?: boolean
      /** 文件，默认 true */
      file?: boolean
      /** 语音，默认 true */
      voice?: boolean
      /** 视频，默认 false */
      video?: boolean
      /** @提及，默认 true */
      mention?: boolean
    }
    /** 是否自动聚焦输入框，默认 false */
    autoFocus?: boolean
    /** 聚焦时边框颜色，不设置则使用默认主题色 */
    focusBorderColor?: string
    /** 光标颜色，不设置则使用默认 */
    caretColor?: string
    /** 文本选中背景色，不设置则使用浏览器默认 */
    selectionColor?: string
    /** 最大输入长度，0 或不设置表示无限制 */
    maxLength?: number
    /** @提及配置 */
    mention?: {
      /** 联系人列表（也可从外部通过 chat-container 灌入） */
      contacts?: MentionContact[]
      /** 是否仅在群聊中启用，默认 true */
      onlyInGroup?: boolean
    }
  }
}

/** 消息操作类型 */
export type MessageActionType =
  | 'quote'
  | 'copy'
  | 'delete'
  | 'recall'
  | 'forward'
  | 'multiSelect'
  | 'translate'
  | 'pin'

/** 消息操作菜单项 */
export interface MessageActionItem {
  /** 操作类型 */
  type: MessageActionType
  /** 显示文本 */
  label: string
  /** 图标名称 */
  icon?: string
  /** 是否危险操作（红色高亮） */
  danger?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 禁用时的提示文本 */
  disabledTip?: string
}

/** 消息操作事件 */
export interface MessageActionEvent {
  /** 操作类型 */
  action: MessageActionType
  /** 目标消息 */
  message: Message
}

/** 联系人（用于 @提及） */
export interface MentionContact {
  userId: string
  name: string
  avatar?: string
  remark?: string
}

/** 消息渲染器插槽名称映射 */
export type MessageSlotName = `message-${Message['type']}`

/** 消息底部扩展插槽名称映射 */
export type MessageFooterSlotName = `message-footer-${Message['type']}`
