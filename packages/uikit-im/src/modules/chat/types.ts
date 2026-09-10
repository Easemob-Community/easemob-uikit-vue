import type {
  EmojiStickerPack,
  EmojiTabsPosition,
  MessageStatusValue,
  UiConversation as Conversation,
  UiGroup,
  UiGroupMember,
  UiMessage,
} from '@easemob/uikit-core'
import type { LastMessageTextResolver } from '../../utils/resolve-last-message-text'

/** 消息气泡布局模式 */
export type MessageLayout = 'left' | 'conversation'

/** 消息气泡形状 */
export type BubbleShape = 'round' | 'square'

/** Header 对齐方式 */
export type HeaderAlign = 'left' | 'center' | 'right'

/** 输入框模式 */
export type InputMode = 'simple' | 'rich'

/** 输入框工具栏位置（方向性语义，脱离厂牌话术） */
export type InputStyle = 'toolbar-top' | 'toolbar-bottom'

/** 加载历史消息模式 */
export type LoadHistoryMode = 'pull-down' | 'scroll-top' | 'auto'

/** 时间显示策略 */
export type TimeDisplayStrategy = boolean | 'always' | 'hover'

/** 消息状态展示风格 */
export type MessageStatusStyle = 'classic' | 'capsule'

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
  /** 状态相对消息气泡的位置，默认 'inline'（气泡末尾、与气泡底部对齐）；'below' 为气泡下方 / Position relative to the bubble, default 'inline' (at bubble end, bottom-aligned) */
  position?: 'below' | 'inline'
  /**
   * 消息状态图标风格。
   * - classic（默认）：沿用 check / doneAll 经典双勾映射；
   * - capsule：数字胶囊风格，未读=空心圆/实心圆点，已读=圆+对勾。
   */
  style?: MessageStatusStyle
  /**
   * 单聊己方「已读」状态图标的展示策略，默认 'latest'；仅单聊生效。
   * - latest：连续已读只在最新一条已读消息上展示已读 icon（仿抖音移动端）；
   * - all：每条已读消息都展示已读 icon。
   * Display strategy for the read icon on self messages in single chats. Default 'latest'.
   */
  readIconDisplay?: 'latest' | 'all'
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
    /** 标题对齐方式，默认 'center'；对单聊/群聊同时生效 */
    align?: HeaderAlign
    /** 是否显示头像，默认 false */
    showAvatar?: boolean
    /** 是否显示群成员数后缀，默认 true；仅群聊生效 */
    showMemberCount?: boolean
    /** 是否显示抽屉入口按钮（聊天信息），默认 true */
    showDrawerEntry?: boolean
    /**
     * 是否显示 header 搜索消息按钮，默认 false（搜索入口归口会话详情抽屉的 Message Search 行；
     * 仅在 messageList.search.enabled 为 true 时生效，开启后 header 恢复显示搜索按钮）。
     * Whether to show the message-search button in the header. Default false — the search entry
     * lives in the conversation-details drawer; takes effect only when message search is enabled.
     */
    showSearchEntry?: boolean
    /**
     * 单聊副标题档位（标题下方区域），默认 'auto'；仅单聊生效：
     * auto（在线状态 + 个性签名，缺哪个显示哪个）/ presence（仅在线状态）/ sign（仅签名）/
     * none（整个副标题区连同「正在输入」提示一起关闭）。
     * 对方正在输入时优先占据此区域；可被 #header-subtitle 插槽整体接管。
     * Subtitle level under the title for single chats. Default 'auto'.
     */
    subtitle?: 'auto' | 'presence' | 'sign' | 'none'
  }
  /** 抽屉配置 / Drawer configuration */
  drawer?: {
    /**
     * 展示模式，默认 'push'：'push' 占位挤压聊天区，抽屉以独立平面区域参与布局
     *（圆角跟随 --uikit-components-radius）；'overlay' 完全遮挡聊天区。
     * 移动端（viewport < 768）两种模式一律回落为满铺全屏（独立页面观感）。
     * Display mode. Default 'push' (takes layout space and squeezes the chat area as an
     * independent flat region); 'overlay' covers the chat area. On mobile (<768px) both fall back to fullscreen.
     */
    mode?: 'overlay' | 'push'
    /** 抽屉宽度（px），默认 320；push 与 overlay 模式均生效，全屏模式忽略 / Drawer width in px. Default 320; ignored in fullscreen */
    width?: number
  }
  /** 消息列表配置 */
  messageList?: {
    /** 消息布局模式，默认 'conversation' */
    layout?: MessageLayout
    /** 是否显示头像（自己与对方的统一开关），默认 true */
    showAvatar?: boolean
    /**
     * 是否显示「自己」的头像，默认 true；仅在 showAvatar 为 true 时生效。
     * 设为 false 可隐藏自己的头像而对方头像照常显示（微信/QQ 式「隐藏我的头像」）。
     */
    showSelfAvatar?: boolean
    /** 时间显示策略，默认 false（不显示），可设置为 true / 'always' / 'hover' */
    showTime?: TimeDisplayStrategy
    /** 气泡形状（圆角档位：'round' = 16px / 'square' = 8px），默认 'round' / Bubble corner preset, default 'round' (16px); 'square' is 8px */
    bubbleShape?: BubbleShape
    /**
     * 中性气泡（对方）样式：'filled' 带底色（默认）/ 'plain' 无底色纯文字。
     * Neutral bubble (peer side) style: 'filled' with background (default) or 'plain' text-only without background.
     */
    bubbleStyle?: 'filled' | 'plain'
    /**
     * 对方语音消息未播放红点：默认 true（本会话实时收到的语音未点击时，气泡外侧垂直居中显示红点，点击后隐藏；
     * 历史/漫游消息无播放状态，永不显示，刷新页面即复位）。
     * 单条消息级覆盖：在消息项插槽（如 #message-voice）内对 INJECTION_KEY.VOICE_UNREAD_DOT 深一层 provide。
     * Whether to show an unread red dot on peer voice messages (default true; runtime-only, resets on refresh).
     * Per-message override: provide INJECTION_KEY.VOICE_UNREAD_DOT one level deeper inside item slots.
     */
    voiceUnreadDot?: boolean
    /** 头像尺寸（px），默认 36 */
    avatarSize?: number
    /** 左键点击消息头像是否打开用户名片，默认 true；右键菜单（查看资料/@提及）不受此开关影响 */
    avatarClickViewProfile?: boolean
    /** 消息项之间的间距（px），默认 12 */
    messageGap?: number
    /** 消息列表内边距（px），默认 16 */
    messagePadding?: number
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
    /** 消息搜索配置（居中 Modal 形态，支持关键词高亮与消息类型筛选） */
    search?: {
      /** 是否启用消息搜索入口，默认 false */
      enabled?: boolean
      /** 是否启用 SDK 服务端消息搜索（websdk2 searchMessages），默认 false（仅搜索本地已加载消息）；开启后出现「当前会话/全部会话」作用域切换 */
      enableServerSearch?: boolean
      /** 每页条数，默认 20 */
      pageSize?: number
    }
    /** 切换会话时是否自动定位到首条@我的消息，默认 true */
    autoLocateAtMe?: boolean
    /** 消息发送状态展示配置 */
    messageStatus?: MessageStatusConfig
    /** 引用展示配置 */
    quote?: {
      /**
       * 引用卡片是否展示原消息发送人头像，默认 false。
       * Whether the quote card shows the original sender's avatar. Default false.
       */
      showAvatar?: boolean
    }
  }
  /** 消息操作配置 */
  messageAction?: {
    /** 启用引用，默认 true */
    enableQuote?: boolean
    /** 启用复制，默认 true（仅文本消息生效） */
    enableCopy?: boolean
    /** 启用下载，默认 true（仅文件消息生效） */
    enableDownload?: boolean
    /** 启用删除，默认 true */
    enableDelete?: boolean
    /** 启用撤回，默认 true */
    enableRecall?: boolean
    /** 启用撤回他人消息，默认 true（仅群主/管理员在群聊中生效） */
    enableRecallOther?: boolean
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
    /** 输入框工具栏位置，默认 'toolbar-top'（工具栏在上、输入框在下）；'toolbar-bottom' 为工具栏在下、输入框在上 */
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
      /** 提及功能（@），默认 true */
      mention?: boolean
    }
    /** 是否自动聚焦输入框，默认 false */
    autoFocus?: boolean
    /** 聚焦时边框颜色。默认聚焦高亮关闭（边框保持默认色，无"聚焦光环"）；显式传入才启用对应边框色 */
    focusBorderColor?: string
    /** 光标颜色，不设置则跟随主题色（--uikit-primary） / Caret color, defaults to the theme primary color */
    caretColor?: string
    /** 文本选中背景色，不设置则使用主题选中色（--uikit-selection-bg，跟随主题色） */
    selectionColor?: string
    /** 最大输入长度，0 或不设置表示无限制 */
    maxLength?: number
    /** 提及配置（@） */
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
    /** 是否允许拖拽调整输入区高度（仅 PC，手柄在输入卡片上缘；simple 模式默认高 132px），默认 true / Whether the input area height can be resized by dragging (PC only), default true */
    resizable?: boolean
    /** 是否显示「展开输入框」角标（仅 PC，卡片右上角；点击后输入区升至 212px，再次点击或 Esc 恢复默认；拖拽超过 212px 时角标自动呈现恢复态），默认 true / Whether to show the expand-input corner toggle (PC only), default true */
    expandable?: boolean
    /** 表情包（sticker/GIF）配置，默认 [] 不展示表情包 tab；以图片消息发送并打 ext.isSticker 标记，按表情渲染、不启用图片预览 / Sticker packs shown as extra tabs in the emoji picker */
    stickerPacks?: EmojiStickerPack[]
    /** Emoji 面板配置 / Emoji picker config */
    emoji?: {
      /** 是否启用「常用」最近使用区（置于表情视图顶部），默认 true；关闭后不展示常用区也不再记录 / Whether to enable the recent-emoji section at the top of the emoji view, default true */
      recent?: boolean
      /** 常用列表长度（保留最近使用个数），默认 5 / Number of recently-used emojis kept, default 5 */
      recentCount?: number
      /** tab 位置：顶部/底部/左侧/右侧，默认 'bottom' / Tabs position: top/bottom/left/right, default 'bottom' */
      tabsPosition?: EmojiTabsPosition
      /** sticker 悬停时切换展示 gif（需提供 thumbUrl 预览图），默认 true / Swap to the gif on hover when thumbUrl is present, default true */
      stickerHover?: boolean
      /** 「Emoji」视图 tab 预览小图 URL（可选，展示图片而非文字）/ Optional icon for the "Emoji" view tab, shown as an image preview instead of text */
      emojiIcon?: string
    }
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
    /** 提及点击回调（@） */
    onMentionClick?: (userId: string) => void
    /**
     * 点击消息中的 @名字时，是否在消息列表内滚动定位到该用户最近一条消息（默认 true）。
     * 仅当未配置 onMentionClick 时生效；定位同时仍会对外触发 at-me-click 事件。
     * / Whether clicking an @mention scrolls to and highlights the mentioned user's latest message in the list (default true).
     * Only applies when onMentionClick is not configured; the at-me-click event is still emitted alongside.
     */
    locateOnMentionClick?: boolean
  }
}

/** 消息操作类型 */
export type MessageActionType =
  | 'quote'
  | 'copy'
  | 'download'
  | 'delete'
  | 'recall'
  | 'recallOther'
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
  /** 用户 ID（@提及的实际目标） */
  userId: string
  /** 展示名称（昵称，无昵称时回落到 userId） */
  name: string
  /** 头像地址（可选） */
  avatar?: string
  /** 备注名（可选，优先于 name 展示） */
  remark?: string
}

/** 消息渲染器插槽名称映射 */
export type MessageSlotName = `message-${UiMessage['type']}`

/** 消息底部扩展插槽名称映射 */
export type MessageFooterSlotName = `message-footer-${UiMessage['type']}`

/** 通用抽屉壳 props / Props for the generic chat drawer shell */
export interface ChatDrawerProps {
  /** 是否显示抽屉 */
  show: boolean
  /** 是否显示遮罩层，默认 true */
  overlay?: boolean
  /** 点击遮罩层是否关闭抽屉，默认 true */
  closeOnClickOverlay?: boolean
  /** 抽屉宽度，默认 320（数字表示 px，字符串透传 CSS 值） */
  width?: string | number
  /** 抽屉顶部偏移，默认 0（数字表示 px，字符串透传 CSS 值）；push 与全屏模式下忽略 */
  offsetTop?: string | number
  /**
   * 展示模式，默认 'push'：'push' 作为静态 flex 项占位挤压聊天区（无遮罩、点击外部不关闭）/
   * 'overlay' 绝对定位覆盖聊天区。
   * Display mode. Default 'push' (static flex item that squeezes the chat area, no mask,
   * no click-outside-to-close); 'overlay' is an absolute overlay.
   */
  mode?: 'overlay' | 'push'
  /**
   * 全屏模式（移动端独立页面），默认 false：忽略 offsetTop 与宽度，满铺整个聊天容器且圆角归零。
   * Fullscreen mode (mobile standalone page). Default false. Ignores offsetTop/width and
   * covers the whole chat container with no border radius.
   */
  fullscreen?: boolean
}

/** 整块接管 `#drawer` 插槽的 scope / Slot scope for the whole-drawer takeover */
export interface ChatDrawerSlotScope {
  /** 当前会话 */
  conversation: Conversation | null | undefined
  /** 是否群聊 */
  isGroup: boolean
  /** 抽屉是否打开 */
  show: boolean
  /** 打开抽屉 */
  open: () => void
  /** 关闭抽屉 */
  close: () => void
  /** 抽屉顶部偏移（header 实际高度，单位 px） */
  offsetTop: number
  /** 抽屉展示模式（'overlay' / 'push'） */
  mode: 'overlay' | 'push'
  /** 是否全屏模式（移动端独立页面） */
  fullscreen: boolean
}

/** 会话详情抽屉二级页标识 / ChatInfoDrawer secondary page key */
export type ChatInfoDrawerPage = 'members' | 'member-search' | 'files' | null

/** 部分接管 `ChatInfoDrawer` section 插槽的 scope / Slot scope for ChatInfoDrawer section takeovers */
export interface ChatInfoDrawerSlotScope {
  /** 当前会话 */
  conversation: Conversation | null | undefined
  /** 是否群聊 */
  isGroup: boolean
  /** 群 ID（非群聊时为空字符串） */
  groupId: string
  /** 当前群信息 */
  group?: UiGroup
  /** 群成员列表 */
  members: UiGroupMember[]
  /** 群成员数 */
  memberCount: number
  /** 当前登录用户 ID */
  currentUserId: string
  /** 当前用户是否为群主 */
  isOwner: boolean
  /** 当前用户是否为管理员 */
  isAdmin: boolean
  /** 当前用户是否可添加成员 */
  canAddMember: boolean
  /** 群信息加载中 */
  loadingGroup: boolean
  /** 当前激活的二级页（null 为一级页） */
  activePage: ChatInfoDrawerPage
  /** 关闭当前二级页（返回一级页） */
  closeMemberList: () => void
  /** 关闭抽屉 */
  close: () => void
}
