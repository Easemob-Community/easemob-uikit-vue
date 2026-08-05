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
import { ref } from 'vue'
import { pinyin } from 'pinyin-pro'
import {
  setPinyinAdapter,
  useContactStore,
  useConversation,
} from '@easemob/uikit'
import type { EmojiStickerPack, UiContact, UiConversation } from '@easemob/uikit'

/** 示例表情包（GIF），用于验证 emoji picker 的 sticker/GIF 发送链路；实际业务请替换为自有 CDN 资源 */
const demoStickerPacks: EmojiStickerPack[] = [
  {
    id: 'demo-gifs',
    name: '动图',
    iconUrl: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',
    stickers: [
      { key: 'celebrate', name: '庆祝', url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif' },
      { key: 'dance', name: '跳舞', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif' },
      { key: 'thumbs-up', name: '点赞', url: 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif' },
    ],
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

export function useDemoSettings() {
  /* ===== Input 组件风格演示 ===== */
  const inputVariant = ref<'default' | 'search' | 'filled' | 'ghost' | 'underline'>('search')
  const inputDemoValue = ref('')

  /* ===== 聊天输入框配置 ===== */
  const chatInputMode = ref<'simple' | 'rich'>('simple')
  const chatInputStyle = ref<'wechat' | 'feishu'>('wechat')
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
  const chatMessageStatusShowText = ref(false)
  const chatMessageStatusDirection = ref<'horizontal' | 'vertical'>('horizontal')
  const chatMessageStatusPosition = ref<'below' | 'inline'>('below')

  /* ===== 联系人容器搜索控制 ===== */
  const showHomeSearch = ref(true)
  const showContactSearch = ref(true)
  const showGroupSearch = ref(true)

  /* ===== SDK 初始化 / 登录配置 ===== */
  const sdkAppKey = ref('easemob-demo#support')
  const sdkApiUrl = ref('')
  const sdkDebug = ref(false)
  const loginUser = ref('hfp')
  const loginPassword = ref('1')
  const loginToken = ref('')
  const loginMode = ref<'password' | 'token'>('password')

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
    chatMessageStatusShowText,
    chatMessageStatusDirection,
    chatMessageStatusPosition,
    // 搜索控制
    showHomeSearch,
    showContactSearch,
    showGroupSearch,
    // SDK 初始化 / 登录
    sdkAppKey,
    sdkApiUrl,
    sdkDebug,
    loginUser,
    loginPassword,
    loginToken,
    loginMode,
    // 演示数据
    pinyinAdapterEnabled,
    togglePinyinAdapter,
    injectMockConversations,
    injectMockContacts,
  }
}

export { demoStickerPacks }
