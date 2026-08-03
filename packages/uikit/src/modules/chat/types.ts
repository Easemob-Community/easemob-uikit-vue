import type { UiMessage } from '../../sdk/types'
import type { MessageStatusValue } from '../../constants'
import type { EmojiStickerPack } from '../../components/emoji-picker/types'
import type { LastMessageTextResolver } from '../../utils/resolve-last-message-text'

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

/** 消息状态展示配置 */
export interface MessageStatusConfig {
  /** 是否显示状态文本，默认 false（仅展示 icon） */
  showText?: boolean
  /** 状态文本映射，未指定时从 locale 读取默认文案 */
  textMap?: Partial<Record<MessageStatusValue, string>>
  /** 状态图标映射，未指定时使用默认图标 */
  iconMap?: Partial<Record<MessageStatusValue, string>>
  /** 文本与图标的排列方向，默认 'horizontal' */
  direction?: 'horizontal' | 'vertical'
  /** 状态相对消息气泡的位置，默认 'below'（气泡下方）/ Position relative to the bubble */
  position?: 'below' | 'inline'
}

/**
 * 消息发送拦截钩子
 * - beforeSend: 返回 false 阻止发送，返回 Promise<false> 异步阻止
 * - afterSend: 发送成功后的回调
 */
export interface ChatSendHooks {
  /** 发送前拦截，返回 false 则阻止发送 */
  beforeSend?: (message: Partial<UiMessage>) => boolean | Promise<boolean>
  /** 发送成功后的回调 */
  afterSend?: (message: UiMessage) => void
}

/** 聊天页面全局配置 */
export interface ChatConfig {
  /** 是否启用草稿功能（切换会话时自动保存/恢复输入内容），默认 true */
  enableDraft?: boolean
  /** 消息发送拦截钩子 */
  hooks?: ChatSendHooks
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
    /** 时间显示策略，默认 false（不显示），可设置为 true / 'always' / 'hover' */
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
    /** 单个会话最大消息存储数，超出时从旧消息开始裁剪，默认 300 */
    maxMessageCount?: number
    /** 置顶横幅配置 */
    pinnedBar?: {
      /** 是否显示顶部置顶条，默认 true */
      visible?: boolean
      /** 预览文本最大长度，默认 30 */
      maxPreviewLength?: number
    }
    /** 切换会话时是否自动定位到首条@我的消息，默认 true */
    autoLocateAtMe?: boolean
    /** 消息发送状态展示配置 */
    messageStatus?: MessageStatusConfig
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
    /** 启用编辑，默认 true（仅 isSelf 且文本消息生效） */
    enableEdit?: boolean
    /** 启用转发，默认 true */
    enableForward?: boolean
    /** 启用多选，默认 true */
    enableMultiSelect?: boolean
    /** 启用翻译，默认 true（仅文本消息生效） */
    enableTranslate?: boolean
    /** 启用语音转文字，默认 true（仅带 url 的语音消息生效） */
    enableVoiceToText?: boolean
    /** 启用置顶/取消置顶，默认 true */
    enablePin?: boolean
    /** 撤回禁用时长（毫秒），超过该时长后无法撤回，默认 2 分钟（120000） */
    recallDisableDuration?: number
    /** 翻译目标语言，例如 'zh-Hans'、'en'。不设置时根据 UIKIT 当前 locale 自动选择（zh-CN→zh-Hans，en→en，其他默认 en） */
    translateTargetLang?: string
  }
  /** 群已读回执配置 */
  groupReadReceipt?: {
    /** 是否启用群已读回执，默认 false */
    enabled?: boolean
    /** 群人数上限，默认 200（超过此人数不发已读回执） */
    maxGroupSize?: number
  }
  /** 群成员列表配置 */
  groupMember?: {
    /** 是否允许对成员发起单聊，默认 'all' */
    allowChat?: 'all' | 'contact' | 'none'
  }
  /** 群管理功能配置 */
  groupManagement?: {
    /** 二级页面展示方式：drawer（抽屉）或 modal（居中弹窗），默认 drawer */
    displayMode?: 'drawer' | 'modal'
    /** 是否展示全员禁言开关，默认 true */
    showMuteAll?: boolean
    /** 是否展示禁言列表入口，默认 true */
    showMuteList?: boolean
    /** 是否展示黑名单入口，默认 true */
    showBlocklist?: boolean
    /** 是否展示白名单入口，默认 true */
    showAllowlist?: boolean
    /** 是否展示共享文件入口，默认 true */
    showSharedFiles?: boolean
    /** 是否展示入群申请入口，默认 true */
    showJoinRequests?: boolean
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
      /** 视频，默认 true */
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
    /** 是否启用输入状态提示（对方正在输入...），默认 true */
    enableTyping?: boolean
    /** 是否显示发送按钮，默认 true */
    showSendButton?: boolean
    /** 表情包（sticker/GIF）配置，默认 [] 不展示表情包 tab / Sticker packs shown as extra tabs in the emoji picker */
    stickerPacks?: EmojiStickerPack[]
  }
  /** 会话列表最新一条消息文案解析器；custom 消息等场景可由业务自定义预览内容 */
  lastMessageTextResolver?: LastMessageTextResolver
  /** 文本消息配置 */
  textMessage?: {
    /** 是否启用 URL 识别为可点击链接，默认 true */
    enableLinkify?: boolean
    /**
     * 链接点击拦截器
     * - 返回 false：阻止跳转
     * - 返回 string：跳转到返回值指定的地址
     * - 返回 void / undefined / true：默认行为（跳转原始 URL）
     */
    onLinkClick?: (url: string) => boolean | string | void
    /** 是否启用 @提及高亮识别，默认 true */
    enableMentionHighlight?: boolean
    /** @提及点击回调 */
    onMentionClick?: (userId: string) => void
  }
}

/** 消息操作类型 */
export type MessageActionType =
  | 'quote'
  | 'copy'
  | 'delete'
  | 'recall'
  | 'edit'
  | 'forward'
  | 'multiSelect'
  | 'translate'
  | 'voiceToText'
  | 'pin'
  | 'unpin'

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
  message: UiMessage
}

/** 联系人（用于 @提及） */
export interface MentionContact {
  userId: string
  name: string
  avatar?: string
  remark?: string
}

/** 消息渲染器插槽名称映射 */
export type MessageSlotName = `message-${UiMessage['type']}`

/** 消息底部扩展插槽名称映射 */
export type MessageFooterSlotName = `message-footer-${UiMessage['type']}`
