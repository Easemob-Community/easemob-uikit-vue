/**
 * Demo 设置状态集中管理
 *
 * 职责：
 * - 持有设置抽屉内全部可配置状态（输入框、消息列表、已读回执、搜索控制、SDK 登录等）
 * - 提供演示数据注入动作（mock 会话 / mock 联系人 / 拼音 adapter）
 *
 * 设计取舍：
 * - 只做「状态 + 动作」的聚合，不持有任何 UI 结构，供各设置面板组件（components/settings/*）
 *   与 demo-page.vue 的 chatConfig 共同消费，保证同一状态只有一个来源
 * - Provider 四开关仍在 app.vue 持有，通过 props/emits 双向绑定，不进入本 composable
 */
import { computed, ref } from 'vue'
import { pinyin } from 'pinyin-pro'
import {
  DEFAULT_CONVERSATION_TABS,
  NOTICE_EVENT_TYPE,
  createUIKitStorageKey,
  setKeyboardShortcutsEnabled,
  setPinyinAdapter,
  useContactStore,
  useConversation,
  useUIKit,
} from '@easemob-community/uikit-im'
import type { ConversationTabKey, EmojiStickerPack, NoticeConfig, UiContact, UiConversation } from '@easemob-community/uikit-im'

/** Dev Hints 开关的 localStorage 记忆 key：值 'off' 表示用户手动关闭 */
const DEV_HINTS_STORAGE_KEY = 'demo-dev-hints-enabled'

/** 键盘操作总开关的 localStorage 记忆 key：值 'off' 表示用户手动关闭 */
const KEYBOARD_SHORTCUTS_STORAGE_KEY = 'demo-keyboard-shortcuts-enabled'

/** SDK 日志收集开关的 localStorage 记忆 key：值 'on' 表示开启 */
const COLLECT_SDK_LOG_STORAGE_KEY = 'demo-collect-sdk-log'

/** UIKit / SDK 日志收集级别的 localStorage 记忆 key */
const UIKIT_LOG_LEVEL_STORAGE_KEY = 'demo-uikit-log-level'
const SDK_LOG_LEVEL_STORAGE_KEY = 'demo-sdk-log-level'

type DemoUikitLogLevel = 'debug' | 'info' | 'warn' | 'error'
type DemoSdkLogLevel = 'debug' | 'warn' | 'error'

function readStorage<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = localStorage.getItem(key)
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

/**
 * SDK 日志收集开关（模块级单例）。
 * Provider 在 app.vue 外层（无 useUIKit 上下文）也需要读取，故不放进 createDemoSettings。
 * 开启后 UIKit 同时持久化 SDK 层日志（console 拦截 / setLogger 注入自适应）。
 */
export const demoCollectSdkLog = ref(localStorage.getItem(COLLECT_SDK_LOG_STORAGE_KEY) === 'on')

export function toggleDemoCollectSdkLog(enabled: boolean) {
  demoCollectSdkLog.value = enabled
  localStorage.setItem(COLLECT_SDK_LOG_STORAGE_KEY, enabled ? 'on' : 'off')
}

/** UIKit 层日志收集级别（模块级单例，默认 'info'） */
export const demoUikitLogLevel = ref<DemoUikitLogLevel>(
  readStorage(UIKIT_LOG_LEVEL_STORAGE_KEY, ['debug', 'info', 'warn', 'error'], 'info'),
)

export function setDemoUikitLogLevel(level: DemoUikitLogLevel) {
  demoUikitLogLevel.value = level
  localStorage.setItem(UIKIT_LOG_LEVEL_STORAGE_KEY, level)
}

/** SDK 层日志收集级别（模块级单例，默认 'warn'） */
export const demoSdkLogLevel = ref<DemoSdkLogLevel>(
  readStorage(SDK_LOG_LEVEL_STORAGE_KEY, ['debug', 'warn', 'error'], 'warn'),
)

export function setDemoSdkLogLevel(level: DemoSdkLogLevel) {
  demoSdkLogLevel.value = level
  localStorage.setItem(SDK_LOG_LEVEL_STORAGE_KEY, level)
}

/** SDK 版本切换的 localStorage 记忆 key */
const SDK_VERSION_STORAGE_KEY = 'demo-sdk-version'

/** 4.x isHttpDNS 开关的 localStorage 记忆 key：值 'off' 表示关闭（自建服务验证） */
const SDK_IS_HTTP_DNS_STORAGE_KEY = 'demo-sdk-is-http-dns'

/** demo 侧可选 SDK 版本：5.x（websdk5，默认工厂自注册）/ 4.x（webim4，注入模式） */
export type DemoSdkVersion = 'websdk5' | 'webim4'

/**
 * SDK 版本（模块级单例，默认 'websdk5'）。
 * app.vue 的 Provider 需要根据它决定 adapter prop，且登录页在 useDemoSettings 上下文之外
 * 也要读，故不放进 createDemoSettings。
 */
export const demoSdkVersion = ref<DemoSdkVersion>(
  readStorage(SDK_VERSION_STORAGE_KEY, ['websdk5', 'webim4'], 'websdk5'),
)

/**
 * 切换 SDK 版本：持久化后整页刷新。
 * adapter 实例随 Provider 常驻（注入模式登录/登出归业务），运行时热切换会残留旧实例状态，
 * 最简可靠做法是切完直接 reload，由新一轮挂载按记忆值装配。
 */
export function setDemoSdkVersion(version: DemoSdkVersion) {
  if (demoSdkVersion.value === version)
    return
  demoSdkVersion.value = version
  localStorage.setItem(SDK_VERSION_STORAGE_KEY, version)
  location.reload()
}

/**
 * 4.x isHttpDNS 开关（模块级单例，默认 true）。
 * 自建服务验证时关闭，配合 sdkApiUrl 透传给 4.x `new WebIM.connection(params)`；
 * 仅 webim4 模式下参与 init 配置组装。
 */
export const sdkIsHttpDNS = ref(localStorage.getItem(SDK_IS_HTTP_DNS_STORAGE_KEY) !== 'off')

export function setSdkIsHttpDNS(enabled: boolean) {
  sdkIsHttpDNS.value = enabled
  localStorage.setItem(SDK_IS_HTTP_DNS_STORAGE_KEY, enabled ? 'on' : 'off')
}

/** 系统通知话术档位（模块级单例）。Provider 在 app.vue 外层（无 useUIKit 上下文）也需要读取，故不放进 createDemoSettings。 */
export const noticeTone = ref<'default' | 'playful' | 'silent'>('default')

/**
 * 系统通知自定义配置（Provider noticeConfig 示例，模块级随 noticeTone 推导）：
 * - playful：俏皮话术覆盖成员加入/退出/群创建文案，并隐藏批量加入（>5 人）刷屏
 * - silent：直接禁用成员加入/退出/群创建通知（演示 disabledEvents）
 * - default：空配置回落内置多语言文案
 */
export const noticeConfig = computed<NoticeConfig>(() => {
  if (noticeTone.value === 'playful') {
    return {
      renderText: (ctx) => {
        if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_JOINED)
          return `欢迎 ${ctx.params.name} 闪亮登场~`
        if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_EXITED)
          return `${ctx.params.name} 溜了溜了`
        if (ctx.eventType === NOTICE_EVENT_TYPE.GROUP_CREATED)
          return '新群开张，喜气洋洋！'
        return null
      },
      filter: (ctx) => {
        // 批量加入（>5 人）避免刷屏，直接隐藏
        if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_JOINED && (ctx.params.count as number) > 5)
          return false
        return true
      },
    }
  }
  if (noticeTone.value === 'silent') {
    return {
      disabledEvents: [
        NOTICE_EVENT_TYPE.MEMBER_JOINED,
        NOTICE_EVENT_TYPE.MEMBER_EXITED,
        NOTICE_EVENT_TYPE.GROUP_CREATED,
      ],
    }
  }
  return {}
})

/** 会话列表侧边栏默认宽度（px）：无记忆时的初始值，与 UIKIT 容器默认宽度 --uikit-sidebar-width 保持一致 */
const SIDEBAR_DEFAULT_WIDTH = 360

/** 会话列表侧边栏宽度可调范围 */
const SIDEBAR_MIN_WIDTH = 240
const SIDEBAR_MAX_WIDTH = 480

/** 预设测试账号（一键填入用户 + Token，免去每次手动复制） */
export interface DemoPresetUser {
  /** 按钮显示名 */
  label: string
  /** 用户名 */
  user: string
  /** 登录 AccessToken */
  token: string
}

/** 预设账号列表：hfp / pfh / pfh2 */
const demoPresetUsers: DemoPresetUser[] = [
  { label: 'hfp', user: 'hfp', token: 'YWMtt1uvsJFEEfGLvmUp95pHgyZVsAd-uUblpSk5yg-TZXCn3yKQOJ8R8ZT7kRZVZ2IzAwMAAAGf1Q9A-zeeSADeavDML9qKVDwwuZeVK-eWwyTBP3Q0xPpTFGHNjPYU_Q' },
  { label: 'pfh', user: 'pfh', token: 'YWMt2L0MEpFEEfGzYtkmnAOhAiZVsAd-uUblpSk5yg-TZXCAQPjQT0cR8Y8fKcyJ0N-CAwMAAAGf1RAbvjeeSABhTlXEQ9FIBlmX4W53N7YYv8MnL7GbUEMYJ1OD91tjtg' },
  { label: 'pfh2', user: 'pfh2', token: 'YWMtHIsOpqavEfG4cb3Jv6mCtSZVsAd-uUblpSk5yg-TZXAZ6lAwpq8R8agqMzqiXyggAwMAAAGgYWit6zeeSAAGzZ5ebuEi-0IeTYpBQ61S3SQAOuxlTpEkA1OFJdd-aQ' },
]

/** 环信表情资源（本地 GIF + JPG 封面），来自 assets/emojis/huanxin，随构建内联为静态资源 */
const huanxinGifs = import.meta.glob('../assets/emojis/huanxin/*.gif', { eager: true, query: '?url', import: 'default' })
const huanxinCovers = import.meta.glob('../assets/emojis/huanxin/*-封面.jpg', { eager: true, query: '?url', import: 'default' })

/** 贴纸 key → 中文名映射（与设计稿表情面板一致） */
const HUANXIN_STICKER_META: { key: string, name: string }[] = [
  { key: 'biubiu', name: '亮个相吧' },
  { key: 'caffe', name: '辛苦啦' },
  { key: 'debug', name: 'Bug 终结者' },
  { key: 'dont_wanna', name: '你说神嘛' },
  { key: 'error', name: '报错了' },
  { key: 'like', name: '真棒' },
  { key: 'insane', name: '厉害' },
  { key: 'jajaja', name: '笑死' },
  { key: 'success', name: '成功啦' },
  { key: 'likes', name: '真棒棒' },
  { key: 'OKDK', name: '好的收到' },
  { key: 'roll_out', name: '上线成功' },
  { key: 'thanks', name: '谢谢老板' },
]

/** 示例表情包（本地 GIF），用于验证 emoji picker 的 sticker/GIF 发送链路；实际业务请替换为自有 CDN 资源 */
const demoStickerPacks: EmojiStickerPack[] = [
  {
    id: 'huanxin',
    name: '环信表情',
    iconUrl: huanxinCovers['../assets/emojis/huanxin/biubiu-封面.jpg'] as string,
    stickers: HUANXIN_STICKER_META.map(({ key, name }) => ({
      key,
      name,
      thumbUrl: huanxinCovers[`../assets/emojis/huanxin/${key}-封面.jpg`] as string,
      url: huanxinGifs[`../assets/emojis/huanxin/${key}.gif`] as string,
    })),
  },
]

/** 生成 1000 条模拟会话数据用于测试滚动效果 */
function generateMockConversations(count = 1000): UiConversation[] {
  const messages = [
    '你好，最近怎么样？',
    '明天一起吃饭吧',
    '项目进展如何？',
    '收到，我看看',
    '周末有空吗？',
    '这个方案不错',
    '下午开会讨论一下',
    '文件已发送，请查收',
    '好的，没问题',
    '稍等我一下',
  ]
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id: `mock_conv_${i}`,
    name: `用户${String(i + 1).padStart(4, '0')}`,
    lastMessageText: messages[i % messages.length],
    lastMessageTime: now - i * 60000,
    unreadCount: i % 5 === 0 ? Math.floor(Math.random() * 10) + 1 : 0,
    type: (i % 3 === 0 ? 'groupChat' : 'singleChat') as UiConversation['type'],
    isPinned: i < 5,
    pinnedTime: i < 5 ? now - i * 1000 : undefined,
    isMuted: false,
    marks: [],
  }))
}

/** 生成中英文混杂的联系人 mock 数据 */
function generateMockContacts(): UiContact[] {
  const cn = [
    '张三',
    '李四',
    '王五',
    '赵六',
    '钱七',
    '孙八',
    '周九',
    '吴十',
    '陈小明',
    '林志玲',
    '诸葛亮',
    '欧阳智勇',
    '马云',
    '黄德华',
    '宝宝',
    '高雅萝',
    '叶子',
    '月亮',
    '安心',
    '市场',
  ]
  const en = [
    'Alice',
    'Bob',
    'Charlie',
    'David',
    'Emma',
    'Frank',
    'Grace',
    'Henry',
    'Ivy',
    'Jack',
    'Kate',
    'Leo',
    'Mike',
    'Nina',
    'Oscar',
    'Peter',
    'Queen',
    'Rose',
    'Sam',
    'Tom',
    'Uma',
    'Vincent',
    'Will',
    'Xander',
    'Yara',
    'Zoe',
  ]
  const numId = ['001号客服', '002号客服', '＃特殊字符']
  const list: UiContact[] = []
  cn.forEach((name, i) => list.push({ userId: `cn_${i}`, name }))
  en.forEach((name, i) => list.push({ userId: `en_${i}`, name }))
  numId.forEach((name, i) => list.push({ userId: `num_${i}`, name }))
  return list
}

/** pinyin-pro 适配器实现（业务方例程） */
function createPinyinAdapter() {
  return (text: string) => {
    const full = pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
      .replace(/\s+/g, '')
      .toLowerCase()
    const initialsRaw = pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' })
      .replace(/\s+/g, '')
      .toLowerCase()
    const firstChar = initialsRaw.charAt(0).toUpperCase()
    return {
      pinyin: full,
      initials: initialsRaw,
      firstLetter: /^[A-Z]$/.test(firstChar) ? firstChar : '#',
    }
  }
}

function createDemoSettings() {
  /* ===== Input 组件风格演示 ===== */
  const inputVariant = ref<'default' | 'search' | 'filled' | 'ghost' | 'underline'>('search')
  const inputDemoValue = ref('')

  /* ===== 聊天输入框配置 ===== */
  const chatInputMode = ref<'simple' | 'rich'>('simple')
  const chatInputStyle = ref<'toolbar-top' | 'toolbar-bottom'>('toolbar-top')
  const chatInputFeatures = ref({
    emoji: true,
    image: true,
    file: true,
    voice: true,
    video: true,
    mention: true,
  })
  const chatInputAutoFocus = ref(false)
  const chatInputFocusBorderColor = ref('')
  const chatInputCaretColor = ref('')
  const chatInputSelectionColor = ref('')
  const chatInputMaxLength = ref(0)

  /* ===== 群已读回执配置 ===== */
  const groupReadReceiptEnabled = ref(true)
  const groupReadReceiptMaxSize = ref(200)

  /* ===== 消息列表配置 ===== */
  const chatShowTime = ref<false | true | 'always' | 'hover'>(false)
  const chatMessageSearchEnabled = ref(true)
  /** 服务端消息搜索（付费增值服务，需在环信控制台开通；关闭时纯本地搜索） */
  const chatMessageServerSearchEnabled = ref(false)
  const chatMessageStatusShowText = ref(false)
  const chatMessageStatusDirection = ref<'horizontal' | 'vertical'>('horizontal')
  const chatMessageStatusPosition = ref<'below' | 'inline'>('inline')
  const chatMessageStatusStyle = ref<'classic' | 'capsule'>('classic')
  /** 中性气泡（对方）样式：filled 带底色 / plain 无底色纯文字 */
  const chatBubbleStyle = ref<'filled' | 'plain'>('filled')
  /** 对方语音消息未播放红点（默认开；历史消息无播放状态不显示，刷新复位） */
  const chatVoiceUnreadDot = ref(true)

  /* ===== 状态横幅配置（EmStatusBanner） ===== */
  /** 是否展示 ConversationList 中的状态横幅 */
  const statusBannerEnabled = ref(true)

  /* ===== 会话列表风格配置（EmConversationContainer 档位） ===== */
  /** 列表风格变体：card（圆角白卡）/ compact（平铺列表） */
  const conversationVariant = ref<'card' | 'compact'>('card')
  /** 会话项是否展示头像 */
  const conversationShowAvatar = ref(true)
  /** 未读数量展示模式：count 数字 / dot 仅红点 */
  const conversationUnreadMode = ref<'count' | 'dot'>('count')
  /** 未读徽标归位：inline 信息区行尾 / avatar 头像右上角角标 */
  const conversationUnreadPlacement = ref<'inline' | 'avatar'>('inline')
  /** 未读 Badge 统一位置：top-right / bottom-right */
  const conversationBadgePlacement = ref<'top-right' | 'bottom-right'>('top-right')

  /* ===== 聊天容器风格配置（EmChatContainer 档位） ===== */
  /** 容器风格变体：card（圆角卡片）/ compact（平铺） */
  const chatVariant = ref<'card' | 'compact'>('card')
  /** 抽屉展示模式：push 占位挤压聊天区（默认）/ overlay 完全遮挡（移动端一律回落全屏） */
  const chatDrawerMode = ref<'overlay' | 'push'>('push')
  /** 点击抽屉外部（聊天区 / 空白处）自动关闭抽屉（仅 push 模式生效，默认 true，与库默认一致） */
  const chatDrawerCloseOnClickOutside = ref(true)

  /* ===== 消息通知配置（EmNotification） ===== */
  /** 总开关 */
  const notificationEnable = ref(true)
  /** 浏览器系统通知（页面在后台时） */
  const notificationBrowser = ref(true)
  /** 页内右上角弹窗 */
  const notificationInApp = ref(true)
  /** 首次通知时自动请求浏览器通知权限 */
  const notificationAutoRequest = ref(true)
  /** 触发模式：'background' 仅页面隐藏时（默认）| 'always' 非当前会话即触发 */
  const notificationTriggerMode = ref<'background' | 'always'>('background')
  /** 新消息响铃（onNotify 送达回调演示：Web Audio 哔声，铃声由业务侧实现） */
  const notificationSound = ref(false)

  /* ===== 联系人容器搜索控制 ===== */
  const showHomeSearch = ref(false)
  const showContactSearch = ref(true)
  const showGroupSearch = ref(true)

  /* ===== 会话分栏配置 ===== */
  /** 会话分栏 tab 集合（顺序即渲染优先级；置空数组隐藏 tab 栏） */
  const conversationTabs = ref<ConversationTabKey[]>([...DEFAULT_CONVERSATION_TABS])
  /** 分栏 tab 栏显隐开关 */
  const conversationTabsVisible = ref(true)
  /** 是否用 #tabs 插槽完全接管渲染（配合 useConversationTabs hook） */
  const conversationTabsTakeover = ref(false)
  /** 是否用 #item 插槽完全接管会话项渲染 */
  const conversationItemTakeover = ref(false)
  /** 是否用 #message-action-menu 插槽完全接管消息操作菜单 */
  const messageActionMenuTakeover = ref(false)
  /** 是否用 #user-card / #group-card 插槽完全接管名片弹窗 */
  const userCardTakeover = ref(false)
  /** 是否注入 #watermark 水印覆盖层（聊天区 + 通讯录联系人列表） */
  const watermarkEnabled = ref(false)
  /** 当前激活的分栏 tab */
  const conversationActiveTab = ref<ConversationTabKey>('all')

  /** 分栏 tab 中文标签（demo 面板展示用） */
  const conversationTabLabels: Record<ConversationTabKey, string> = {
    all: '全部',
    unread: '未读',
    atMe: '@我',
    single: '单聊',
    group: '群组',
  }

  /** 按 key 切换 tab 是否展示（保留原顺序） */
  function toggleConversationTab(tab: ConversationTabKey, on: boolean) {
    if (on) {
      if (!conversationTabs.value.includes(tab))
        conversationTabs.value.push(tab)
    }
    else {
      conversationTabs.value = conversationTabs.value.filter(t => t !== tab)
      // 激活的 tab 被移除时回落到 'all'（若仍展示）或第一个 tab
      if (conversationActiveTab.value === tab) {
        conversationActiveTab.value = conversationTabs.value[0] ?? 'all'
      }
    }
  }

  /** 调整 tab 渲染优先级（上移/下移） */
  function moveConversationTab(index: number, dir: -1 | 1) {
    const target = index + dir
    if (index < 0 || target < 0 || target >= conversationTabs.value.length)
      return
    const next = [...conversationTabs.value]
    ;[next[index], next[target]] = [next[target], next[index]]
    conversationTabs.value = next
  }

  /** 快捷预设：仅单聊 / 仅群组 / 单聊 + 群组 / 恢复默认 */
  function presetConversationTabs(preset: 'single' | 'group' | 'singleGroup' | 'default') {
    if (preset === 'single')
      conversationTabs.value = ['single']
    else if (preset === 'group')
      conversationTabs.value = ['group']
    else if (preset === 'singleGroup')
      conversationTabs.value = ['single', 'group']
    else
      conversationTabs.value = [...DEFAULT_CONVERSATION_TABS]
    conversationActiveTab.value = conversationTabs.value[0] ?? 'all'
  }

  /* ===== 会话侧边栏宽度（EmResizable） ===== */
  /**
   * 中间侧边栏宽度：默认 400，范围 240~480。
   * 持久化走 UIKIT 内部配置存储（key：easemob_uikit_{hash(appKey_userId)}_layout_sidebar_width），
   * 按 appKey + 用户隔离，与草稿/邀请通知等内部配置同一套体系。
   */
  const { stores } = useUIKit()
  const sidebarStorageKey = computed(() =>
    createUIKitStorageKey(stores.client.appKey, stores.client.currentUser, 'layout_sidebar_width'),
  )
  const sidebarWidth = ref(readStoredSidebarWidth())
  function readStoredSidebarWidth(): number {
    const raw = localStorage.getItem(sidebarStorageKey.value)
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
    if (Number.isNaN(parsed))
      return SIDEBAR_DEFAULT_WIDTH
    return Math.min(Math.max(parsed, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
  }
  /** 拖拽结束回调：写回状态并持久化到 UIKIT 内部配置存储 */
  function persistSidebarWidth(width: number) {
    sidebarWidth.value = width
    localStorage.setItem(sidebarStorageKey.value, String(width))
  }

  /* ===== 开发者友好模式（Dev Hints） ===== */
  /**
   * 悬停会话项/气泡等区域浮出环信接口 + UIKit 实现思路（D87）。
   * 默认开启，localStorage 记忆用户关闭选择。
   */
  const devHintsEnabled = ref(localStorage.getItem(DEV_HINTS_STORAGE_KEY) === 'on')
  function toggleDevHints(enabled: boolean) {
    devHintsEnabled.value = enabled
    localStorage.setItem(DEV_HINTS_STORAGE_KEY, enabled ? 'on' : 'off')
  }

  /* ===== 键盘操作开关 ===== */
  /**
   * 键盘操作总开关：控制 UIKIT 全部快捷键（ESC 关闭弹层、方向键导航等）。
   * 默认开启，localStorage 记忆；切换时同步调用 setKeyboardShortcutsEnabled 全局生效。
   */
  const keyboardShortcutsEnabled = ref(localStorage.getItem(KEYBOARD_SHORTCUTS_STORAGE_KEY) !== 'off')
  function toggleKeyboardShortcuts(enabled: boolean) {
    keyboardShortcutsEnabled.value = enabled
    setKeyboardShortcutsEnabled(enabled)
    localStorage.setItem(KEYBOARD_SHORTCUTS_STORAGE_KEY, enabled ? 'on' : 'off')
  }
  // 初始化时与 UIKIT 全局开关对齐（localStorage 记忆为关闭时，刷新后保持关闭）
  setKeyboardShortcutsEnabled(keyboardShortcutsEnabled.value)

  /* ===== SDK 初始化 / 登录配置 ===== */
  const sdkAppKey = ref('easemob-demo#support-ngi')
  const sdkApiUrl = ref('')
  const sdkDebug = ref(false)
  const loginUser = ref('hfp')
  const loginPassword = ref('1')
  const loginToken = ref('')
  const loginMode = ref<'password' | 'token'>('password')

  /** 应用预设账号：切到 Token 模式并填入用户 / Token */
  function applyPresetUser(preset: DemoPresetUser) {
    loginUser.value = preset.user
    loginToken.value = preset.token
    loginMode.value = 'token'
  }

  /* ===== 演示数据注入 ===== */

  /** 拼音 adapter 开关（对比体验未注入 vs 已注入的区别） */
  const pinyinAdapterEnabled = ref(false)

  /** 切换拼音 adapter 注入状态 */
  function togglePinyinAdapter(enabled: boolean) {
    pinyinAdapterEnabled.value = enabled
    setPinyinAdapter(enabled ? createPinyinAdapter() : null)
  }

  /** 注入 1000 条模拟会话 */
  function injectMockConversations() {
    const { setLocalConversationList } = useConversation()
    setLocalConversationList(generateMockConversations(1000))
  }

  /** 注入中英文混杂的 mock 联系人并切到通讯录页 */
  function injectMockContacts() {
    const contactStore = useContactStore()
    contactStore.setContactList(generateMockContacts())
  }

  /* ===== AI 流式演示 ===== */

  /** AI 应答开关（mock）：开启后自己发送文本消息自动触发 mock AI markdown 流式回复 */
  const aiMockReplyEnabled = ref(false)

  /** 切换 AI 应答开关 */
  function toggleAiMockReply(enabled: boolean) {
    aiMockReplyEnabled.value = enabled
  }

  return {
    // Input 组件风格演示
    inputVariant,
    inputDemoValue,
    // 聊天输入框
    chatInputMode,
    chatInputStyle,
    chatInputFeatures,
    chatInputAutoFocus,
    chatInputFocusBorderColor,
    chatInputCaretColor,
    chatInputSelectionColor,
    chatInputMaxLength,
    // 群已读回执
    groupReadReceiptEnabled,
    groupReadReceiptMaxSize,
    // 消息列表
    chatShowTime,
    chatMessageSearchEnabled,
    chatMessageServerSearchEnabled,
    chatMessageStatusShowText,
    chatMessageStatusDirection,
    chatMessageStatusPosition,
    chatMessageStatusStyle,
    chatBubbleStyle,
    chatVoiceUnreadDot,
    // 状态横幅
    statusBannerEnabled,
    // 会话列表风格
    conversationVariant,
    conversationShowAvatar,
    conversationUnreadMode,
    conversationUnreadPlacement,
    conversationBadgePlacement,
    // 聊天容器风格
    chatVariant,
    chatDrawerMode,
    chatDrawerCloseOnClickOutside,
    // 消息通知
    notificationEnable,
    notificationBrowser,
    notificationInApp,
    notificationAutoRequest,
    notificationTriggerMode,
    notificationSound,
    // 搜索控制
    showHomeSearch,
    showContactSearch,
    showGroupSearch,
    // 会话分栏
    conversationTabs,
    conversationTabsVisible,
    conversationTabsTakeover,
    conversationItemTakeover,
    messageActionMenuTakeover,
    userCardTakeover,
    watermarkEnabled,
    conversationActiveTab,
    conversationTabLabels,
    toggleConversationTab,
    moveConversationTab,
    presetConversationTabs,
    // SDK 初始化 / 登录
    sdkAppKey,
    sdkApiUrl,
    sdkDebug,
    loginUser,
    loginPassword,
    loginToken,
    loginMode,
    applyPresetUser,
    // 演示数据
    pinyinAdapterEnabled,
    togglePinyinAdapter,
    injectMockConversations,
    injectMockContacts,
    // AI 流式演示
    aiMockReplyEnabled,
    toggleAiMockReply,
    // 侧边栏宽度
    sidebarWidth,
    persistSidebarWidth,
    // 开发者友好模式
    devHintsEnabled,
    toggleDevHints,
    // 键盘操作
    keyboardShortcutsEnabled,
    toggleKeyboardShortcuts,
  }
}

/**
 * 全局单例访问：demo 设置面板（components/settings/*）与 demo-page.vue 必须共享同一份状态，
 * 否则面板修改无法作用到页面。首次调用创建实例，之后一律复用。
 */
let demoSettings: ReturnType<typeof createDemoSettings> | null = null

export function useDemoSettings() {
  if (!demoSettings)
    demoSettings = createDemoSettings()
  return demoSettings
}

export { demoStickerPacks, demoPresetUsers }
