<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  EmAddContactModal,
  EmChatContainer,
  EmContactContainer,
  EmContactDetail,
  EmConversationContainer,
  EmCreateGroupModal,
  EmCustomMessage,
  EmGroupDetail,
  EmIcon,
  EmInput,
  EmPopup,
  EmUserCardModal,
  setPinyinAdapter,
  useClient,
  useContactStore,
  useConversation,
  useLocale,
  useMessageSend,
  useOwnUserInfo,
  useTheme,
  useUIKit,
  useViewport,
} from '@easemob/uikit'
import type { UiContact, UiConversation, UiGroup, UiMessage } from '@easemob/uikit'
import type { CustomMessageBody } from '@easemob/uikit'
import type { EmojiStickerPack } from '@easemob/uikit'
import { pinyin } from 'pinyin-pro'
import NavSidebar from './components/nav-sidebar.vue'
import DemoCardMessage from './components/demo-card-message.vue'
import DemoCardPickerModal from './components/demo-card-picker-modal.vue'
import DemoQuickReplyPanel from './components/demo-quick-reply-panel.vue'

/** Provider 面 三开关 + 自定义 dataSource（v-model 双向绑定到 app.vue） */
const props = defineProps<{
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  useCustomDataSource: boolean
}>()
const emit = defineEmits<{
  (e: 'update:enableContact', v: boolean): void
  (e: 'update:enableBlocklist', v: boolean): void
  (e: 'update:enablePresence', v: boolean): void
  (e: 'update:useCustomDataSource', v: boolean): void
  (e: 'logout'): void
}>()
function toggleEnableContact(v: boolean) { emit('update:enableContact', v) }
function toggleEnableBlocklist(v: boolean) { emit('update:enableBlocklist', v) }
function toggleEnablePresence(v: boolean) { emit('update:enablePresence', v) }
function toggleCustomDataSource(v: boolean) { emit('update:useCustomDataSource', v) }

const { mode, primaryColor, hoverStyle, containerGap, setMode, setPrimaryColor, setHoverStyle, setContainerGap, animationEnabled, animationLevel, animationRipple, setAnimationEnabled, setAnimationLevel, setAnimationRipple } = useTheme()
const { t, locale, setLocale } = useLocale()
const { stores, theme: themeStore } = useUIKit()
const { client, connected, isLoggedIn, currentUser, sdkClient, init, login, logout } = useClient()
const { setLocalConversationList, selectConversation } = useConversation()
const { sendCustomMessage } = useMessageSend()
const { displayName: ownDisplayName, avatarUrl: ownAvatarUrl } = useOwnUserInfo()
const { isMobile } = useViewport()

/** 左侧边栏 tab：会话 / 联系人 */
const sidebarTab = ref<'conversation' | 'contact'>('conversation')

/** H5 页面栈：'list' 会话/联系人列表 | 'chat' 聊天详情 | 'detail' 联系人/群组详情 */
const h5Page = ref<'list' | 'chat' | 'detail'>('list')

const showSettings = ref(false)

/** 当前右侧主区域展示的联系人详情用户 ID */
const detailUserId = ref<string | null>(null)
/** 当前右侧主区域展示的群组详情群 ID */
const detailGroupId = ref<string | null>(null)

// Input 组件风格演示
const inputVariant = ref<'default' | 'search' | 'filled' | 'ghost' | 'underline'>('search')
const inputDemoValue = ref('')

// 输入框配置状态
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

// 输入框扩展配置
const chatInputAutoFocus = ref(false)
const chatInputFocusBorderColor = ref('')
const chatInputCaretColor = ref('')
const chatInputSelectionColor = ref('')
const chatInputMaxLength = ref(0)

// 群已读回执配置
const groupReadReceiptEnabled = ref(true)
const groupReadReceiptMaxSize = ref(200)

// 消息列表配置
const chatShowTime = ref<false | true | 'always' | 'hover'>(false)
const chatMessageStatusShowText = ref(false)
const chatMessageStatusDirection = ref<'horizontal' | 'vertical'>('horizontal')
const chatMessageStatusPosition = ref<'below' | 'inline'>('below')

// 联系人容器搜索控制
const showHomeSearch = ref(true)
const showContactSearch = ref(true)
const showGroupSearch = ref(true)

// 通讯录操作弹窗
const showAddContactModal = ref(false)
const showCreateGroupModal = ref(false)

// 名片消息演示：用户名片弹窗
const showCardUserId = ref('')
const showCardModal = ref(false)
// 名片选择弹窗
const showCardPickerModal = ref(false)

// 快捷回复面板
const showQuickReplyPanel = ref(false)
const chatContainerRef = ref<{ setText?: (text: string) => void }>()

/** 发送指定用户的名片到当前会话（扩展消息演示） */
async function sendCard(userId: string) {
  const cvs = stores.conversation.currentConversation
  if (!cvs || !userId)
    return
  const params: Record<string, string> = { uid: userId }
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  const nickname = contact?.remark || userInfo?.nickname || (userId === currentUser.value ? ownDisplayName.value : undefined) || userId
  params.nickname = nickname
  const avatar = userInfo?.avatarUrl || contact?.avatar || (userId === currentUser.value ? ownAvatarUrl.value : undefined)
  if (avatar)
    params.avatar = avatar
  await sendCustomMessage('userCard', params)
}

/** 判断 custom 消息是否为名片 */
function isUserCardMessage(message: UiMessage): boolean {
  return message.type === 'custom' && (message.body as CustomMessageBody).event === 'userCard'
}

/** 打开名片弹窗 */
function openCardModal(userId: string) {
  showCardUserId.value = userId
  showCardModal.value = true
}

// 群管理 Demo 配置开关
const groupManagementConfig = ref({
  showMuteAll: true,
  showMuteList: true,
  showBlocklist: true,
  showAllowlist: false,
  showSharedFiles: true,
  showJoinRequests: false,
  showMuteAction: true,
  showBlockAction: true,
  showAdminAction: true,
  showRemoveAction: true,
  showChatAction: true,
})

/** 示例表情包（GIF），用于验证 emoji picker 的 sticker/GIF 发送链路
 *  实际业务请替换为自有 CDN 资源
 */
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

/** EmChatContainer 配置 */
const chatConfig = computed(() => ({
  header: { showAvatar: true },
  groupReadReceipt: {
    enabled: groupReadReceiptEnabled.value,
    maxGroupSize: groupReadReceiptMaxSize.value,
  },
  groupManagement: {
    showMuteAll: groupManagementConfig.value.showMuteAll,
    showMuteList: groupManagementConfig.value.showMuteList,
    showBlocklist: groupManagementConfig.value.showBlocklist,
    showAllowlist: groupManagementConfig.value.showAllowlist,
    showSharedFiles: groupManagementConfig.value.showSharedFiles,
    showJoinRequests: groupManagementConfig.value.showJoinRequests,
  },
  input: {
    mode: chatInputMode.value,
    style: chatInputStyle.value,
    features: { ...chatInputFeatures.value },
    autoFocus: chatInputAutoFocus.value,
    showSendButton: false,
    stickerPacks: demoStickerPacks,
    ...(chatInputFocusBorderColor.value ? { focusBorderColor: chatInputFocusBorderColor.value } : {}),
    ...(chatInputCaretColor.value ? { caretColor: chatInputCaretColor.value } : {}),
    ...(chatInputSelectionColor.value ? { selectionColor: chatInputSelectionColor.value } : {}),
    ...(chatInputMaxLength.value > 0 ? { maxLength: chatInputMaxLength.value } : {}),
  },
  messageList: {
    showTime: chatShowTime.value,
    messageStatus: {
      showText: chatMessageStatusShowText.value,
      direction: chatMessageStatusDirection.value,
      position: chatMessageStatusPosition.value,
    },
  },
}))

/** 从联系人详情页进入单聊 */
function enterChatWithUser(userId: string) {
  const contactStore = useContactStore()
  const contact = contactStore.getContact(userId)
  const existing = stores.conversation.conversationList.find(c => c.id === userId)
  if (!existing) {
    stores.conversation.addConversation({
      id: userId,
      name: contact?.name || contact?.remark || userId,
      avatar: contact?.avatar,
      type: 'singleChat',
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(userId)
  sidebarTab.value = 'conversation'
  detailUserId.value = null
  if (isMobile.value) {
    h5Page.value = 'chat'
  }
}

/** 从群组详情页进入群聊 */
function enterChatWithGroup(groupId: string) {
  const existing = stores.conversation.conversationList.find(c => c.id === groupId)
  if (!existing) {
    const group = stores.group.getGroupById(groupId)
    stores.conversation.addConversation({
      id: groupId,
      name: group?.groupName || groupId,
      avatar: group?.avatar,
      type: 'groupChat',
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
  }
  selectConversation(groupId)
  sidebarTab.value = 'conversation'
  detailGroupId.value = null
  if (isMobile.value) {
    h5Page.value = 'chat'
  }
}

/** H5：从聊天返回列表 */
function h5BackToList() {
  h5Page.value = 'list'
  stores.conversation.setCurrentConversationId(null)
}

/** H5：进入联系人/群组详情 */
function h5EnterDetail(type: 'user' | 'group', id: string) {
  if (type === 'user') {
    detailUserId.value = id
    detailGroupId.value = null
  }
  else {
    detailGroupId.value = id
    detailUserId.value = null
  }
  h5Page.value = 'detail'
}

// SDK 初始化相关状态
const sdkAppKey = ref('easemob-demo#support')
const sdkApiUrl = ref('')
const sdkDebug = ref(false)
const loginUser = ref('hfp')
const loginPassword = ref('1')
const loginToken = ref('')
const loginMode = ref<'password' | 'token'>('password')

function handleInit() {
  init({
    appKey: sdkAppKey.value,
    ...(sdkApiUrl.value ? { apiUrl: sdkApiUrl.value } : {}),
    debug: sdkDebug.value,
  })
}

async function handleLogin() {
  if (!loginUser.value) {
    return
  }
  try {
    const params: { user: string; accessToken?: string; password?: string } = {
      user: loginUser.value,
    }
    if (loginMode.value === 'token' && loginToken.value) {
      params.accessToken = loginToken.value
    }
    else if (loginMode.value === 'password' && loginPassword.value) {
      params.password = loginPassword.value
    }
    await login(params)
  }
  catch (err) {
    console.warn('登录失败:', (err as Error).message)
  }
}

async function handleLogout() {
  try {
    await logout?.()
  }
  catch (err) {
    console.warn('登出失败:', (err as Error).message)
  }
  finally {
    emit('logout')
  }
}

function updatePrimaryColor(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  setPrimaryColor(val)
}

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

function injectMockConversations() {
  const list = generateMockConversations(1000)
  setLocalConversationList(list)
}

/* ============== 联系人演示（拼音能力） ============== */

/** 切到联系人页时清空当前会话，避免右侧 Chat 仍显示旧会话 */
watch(sidebarTab, (tab) => {
  if (tab === 'contact') {
    stores.conversation.setCurrentConversationId(null)
  }
  else if (tab === 'conversation') {
    detailUserId.value = null
    detailGroupId.value = null
  }
})

/** 选中会话后清空联系人详情页；H5 时自动跳聊天页 */
watch(() => stores.conversation.currentConversationId, (id) => {
  if (id) {
    detailUserId.value = null
    detailGroupId.value = null
    if (isMobile.value) {
      h5Page.value = 'chat'
    }
  }
})

/** 拼音 adapter 开关（对比体验未注入 vs 已注入的区别） */
const pinyinAdapterEnabled = ref(false)

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

function togglePinyinAdapter(enabled: boolean) {
  pinyinAdapterEnabled.value = enabled
  setPinyinAdapter(enabled ? createPinyinAdapter() : null)
}

/** 生成中英文混杂的联系人 mock 数据 */
function generateMockContacts(): UiContact[] {
  const cn = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
    '陈小明', '林志玲', '诸葛亮', '欧阳智勇', '马云', '黄德华',
    '宝宝', '高雅萝', '叶子', '月亮', '安心', '市场',
  ]
  const en = [
    'Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank',
    'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo',
    'Mike', 'Nina', 'Oscar', 'Peter', 'Queen', 'Rose',
    'Sam', 'Tom', 'Uma', 'Vincent', 'Will', 'Xander', 'Yara', 'Zoe',
  ]
  const numId = ['001号客服', '002号客服', '＃特殊字符']
  const list: UiContact[] = []
  cn.forEach((name, i) => list.push({ userId: `cn_${i}`, name }))
  en.forEach((name, i) => list.push({ userId: `en_${i}`, name }))
  numId.forEach((name, i) => list.push({ userId: `num_${i}`, name }))
  return list
}

function injectMockContacts() {
  const contactStore = useContactStore()
  contactStore.setContactList(generateMockContacts())
  sidebarTab.value = 'contact'
}
</script>

<template>
  <div class="demo-layout">
    <!-- ==================== PC 三栏布局 ==================== -->
    <template v-if="!isMobile">
      <!-- 左侧导航栏（仿微信） -->
      <NavSidebar
        v-model="sidebarTab"
        @open-settings="showSettings = true"
      />

      <!-- 中间侧边栏：会话列表 / 联系人列表 -->
      <div class="demo-layout__sidebar">
        <EmConversationContainer v-if="sidebarTab === 'conversation'">
        </EmConversationContainer>
        <EmContactContainer
          v-else
          :show-home-search="showHomeSearch"
          :show-contact-search="showContactSearch"
          :show-group-search="showGroupSearch"
          @view-change="() => { detailUserId = null; detailGroupId = null }"
          @contact-click="(c: UiContact) => { detailUserId = c.userId; detailGroupId = null }"
          @group-click="(g: UiGroup) => { detailGroupId = g.groupId; detailUserId = null }"
          @add-contact="showAddContactModal = true"
          @create-group="showCreateGroupModal = true"
        />
      </div>

      <!-- 右侧主体：聊天容器 / 联系人详情 / 群组详情 -->
      <div class="demo-layout__main">
        <EmContactDetail
          v-if="detailUserId"
          :user-id="detailUserId"
          @send-message="enterChatWithUser"
          @deleted="detailUserId = null"
        />
        <EmGroupDetail
          v-else-if="detailGroupId"
          :group-id="detailGroupId"
          @send-message="enterChatWithGroup"
        />
        <EmChatContainer
          v-else
          ref="chatContainerRef"
          :config="chatConfig"
        >
          <template #toolbar-extra="{ togglePanel: toggleQuickReplyPanel }">
            <button
              class="demo-toolbar-btn"
              :title="t('demo.quickReply.title')"
              @click="toggleQuickReplyPanel"
            >
              <EmIcon name="chat/3lines_n_arrow" :size="22" />
            </button>
            <button
              class="demo-toolbar-btn"
              :title="t('demo.card.send')"
              @click="showCardPickerModal = true"
            >
              <EmIcon name="people/person_single" :size="22" />
            </button>
          </template>
          <template #input-panel="{ showPanel }">
            <DemoQuickReplyPanel
              v-if="showPanel"
              @select="(text) => chatContainerRef?.setText?.(text)"
            />
          </template>
          <template #message-custom="{ message }">
            <DemoCardMessage
              v-if="isUserCardMessage(message as UiMessage)"
              :message="message as UiMessage"
              @card-click="openCardModal"
            />
            <EmCustomMessage v-else :message="message as UiMessage" />
          </template>
        </EmChatContainer>
      </div>
    </template>

    <!-- ==================== H5 单栏栈式布局 ==================== -->
    <template v-else>
      <!-- 列表页（会话 / 联系人） -->
      <div v-show="h5Page === 'list'" class="h5-page">
        <div class="h5-page__header">
          <span class="h5-page__title">{{ sidebarTab === 'conversation' ? '消息' : '通讯录' }}</span>
          <button class="h5-page__header-btn" @click="showSettings = true">
            <EmIcon name="misc/gear" :size="20" />
          </button>
        </div>
        <div class="h5-page__body">
          <EmConversationContainer v-if="sidebarTab === 'conversation'" :pull-refresh="true" />
          <EmContactContainer
            v-else
            :show-home-search="showHomeSearch"
            :show-contact-search="showContactSearch"
            :show-group-search="showGroupSearch"
            @view-change="() => { detailUserId = null; detailGroupId = null }"
            @contact-click="(c: UiContact) => h5EnterDetail('user', c.userId)"
            @group-click="(g: UiGroup) => h5EnterDetail('group', g.groupId)"
            @add-contact="showAddContactModal = true"
            @create-group="showCreateGroupModal = true"
          />
        </div>
        <!-- H5 底部 TabBar -->
        <nav class="h5-tabbar">
          <button
            class="h5-tabbar__item"
            :class="{ 'h5-tabbar__item--active': sidebarTab === 'conversation' }"
            @click="sidebarTab = 'conversation'"
          >
            <EmIcon name="chat/bubble_fill" :size="22" />
            <span class="h5-tabbar__label">消息</span>
          </button>
          <button
            class="h5-tabbar__item"
            :class="{ 'h5-tabbar__item--active': sidebarTab === 'contact' }"
            @click="sidebarTab = 'contact'"
          >
            <EmIcon name="people/person_3lines_fill" :size="22" />
            <span class="h5-tabbar__label">通讯录</span>
          </button>
        </nav>
      </div>

      <!-- 聊天页 -->
      <div v-show="h5Page === 'chat'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="h5BackToList">
            <EmIcon name="arrow/arrow_left" :size="20" />
          </button>
          <span class="h5-page__title">聊天</span>
          <span class="h5-page__header-spacer" />
        </div>
        <div class="h5-page__body">
          <EmChatContainer
            ref="chatContainerRef"
            :config="chatConfig"
          >
            <template #toolbar-extra="{ togglePanel: toggleQuickReplyPanel }">
              <button
                class="demo-toolbar-btn"
                :title="t('demo.quickReply.title')"
                @click="toggleQuickReplyPanel"
              >
                <EmIcon name="chat/3lines_n_arrow" :size="22" />
              </button>
              <button
                class="demo-toolbar-btn"
                :title="t('demo.card.send')"
                @click="showCardPickerModal = true"
              >
                <EmIcon name="people/person_single" :size="22" />
              </button>
            </template>
            <template #input-panel="{ showPanel }">
              <DemoQuickReplyPanel
                v-if="showPanel"
                @select="(text) => chatContainerRef?.setText?.(text)"
              />
            </template>
            <template #message-custom="{ message }">
              <DemoCardMessage
                v-if="isUserCardMessage(message as UiMessage)"
                :message="message as UiMessage"
                @card-click="openCardModal"
              />
              <EmCustomMessage v-else :message="message as UiMessage" />
            </template>
          </EmChatContainer>
        </div>
      </div>

      <!-- 联系人/群组详情页 -->
      <div v-show="h5Page === 'detail'" class="h5-page">
        <div class="h5-page__header">
          <button class="h5-page__header-btn" @click="h5Page = 'list'">
            <EmIcon name="arrow/arrow_left" :size="20" />
          </button>
          <span class="h5-page__title">详情</span>
          <span class="h5-page__header-spacer" />
        </div>
        <div class="h5-page__body">
          <EmContactDetail
            v-if="detailUserId"
            :user-id="detailUserId"
            @send-message="enterChatWithUser"
            @deleted="detailUserId = null; h5Page = 'list'"
          />
          <EmGroupDetail
            v-else-if="detailGroupId"
            :group-id="detailGroupId"
            @send-message="enterChatWithGroup"
          />
        </div>
      </div>
    </template>

    <!-- 设置抽屉（PC 右侧 / H5 底部） -->
    <EmPopup v-model:show="showSettings" :position="isMobile ? 'bottom' : 'right'">
      <div class="demo-drawer">
        <div class="demo-drawer__header">
          <span class="demo-drawer__title">设置</span>
          <button class="demo-btn demo-btn--icon" @click="showSettings = false">✕</button>
        </div>
        <div class="demo-drawer__body">
          <div class="demo-settings__group">
            <label class="demo-settings__label">主题模式</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': mode === 'light' }"
                @click="setMode('light')"
              >
                亮色
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': mode === 'dark' }"
                @click="setMode('dark')"
              >
                暗色
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': mode === 'auto' }"
                @click="setMode('auto')"
              >
                跟随系统
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">主题色</label>
            <div class="demo-settings__color">
              <input
                type="range"
                min="0"
                max="360"
                :value="primaryColor"
                class="demo-slider"
                @input="updatePrimaryColor"
              />
              <div
                class="demo-color-preview"
                :style="{ backgroundColor: `hsl(${primaryColor}, 100%, 60%)` }"
              />
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">Hover 风格</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': hoverStyle === 'default' }"
                @click="setHoverStyle('default')"
              >
                默认
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': hoverStyle === 'rounded' }"
                @click="setHoverStyle('rounded')"
              >
                圆角卡片
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">头像形状</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': themeStore.avatarShape === 'circle' }"
                @click="themeStore.setAvatarShape('circle')"
              >
                圆形
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': themeStore.avatarShape === 'square' }"
                @click="themeStore.setAvatarShape('square')"
              >
                方形
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">气泡形状</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': themeStore.bubbleShape === 'ground' }"
                @click="themeStore.setBubbleShape('ground')"
              >
                圆角
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': themeStore.bubbleShape === 'square' }"
                @click="themeStore.setBubbleShape('square')"
              >
                直角
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">组件形状</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': themeStore.componentsShape === 'ground' }"
                @click="themeStore.setComponentsShape('ground')"
              >
                圆角
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': themeStore.componentsShape === 'square' }"
                @click="themeStore.setComponentsShape('square')"
              >
                直角
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">容器间距</label>
            <div class="demo-settings__color">
              <input
                type="range"
                min="0"
                max="24"
                :value="containerGap"
                class="demo-slider"
                style="background: linear-gradient(to right, #e5e7eb, var(--uikit-primary-color, hsl(203, 100%, 60%)));"
                @input="(e: Event) => setContainerGap(Number((e.target as HTMLInputElement).value))"
              />
              <span style="font-size: 13px; color: var(--uikit-text-secondary, #6b7280); min-width: 28px; text-align: right;">{{ containerGap }}px</span>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">动画开关</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': animationEnabled }"
                @click="setAnimationEnabled(true)"
              >
                开启
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': !animationEnabled }"
                @click="setAnimationEnabled(false)"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">动画强度</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': animationLevel === 'subtle' }"
                @click="setAnimationLevel('subtle')"
              >
                轻柔
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': animationLevel === 'normal' }"
                @click="setAnimationLevel('normal')"
              >
                标准
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': animationLevel === 'expressive' }"
                @click="setAnimationLevel('expressive')"
              >
                生动
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">波纹效果</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': animationRipple }"
                @click="setAnimationRipple(true)"
              >
                开启
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': !animationRipple }"
                @click="setAnimationRipple(false)"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">Input 组件风格</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': inputVariant === 'default' }"
                @click="inputVariant = 'default'"
              >
                default
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': inputVariant === 'search' }"
                @click="inputVariant = 'search'"
              >
                search
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': inputVariant === 'filled' }"
                @click="inputVariant = 'filled'"
              >
                filled
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': inputVariant === 'ghost' }"
                @click="inputVariant = 'ghost'"
              >
                ghost
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': inputVariant === 'underline' }"
                @click="inputVariant = 'underline'"
              >
                underline
              </button>
            </div>
            <div style="margin-top: 8px;">
              <EmInput
                v-model="inputDemoValue"
                :variant="inputVariant"
                prefix-icon="misc/magnifier2"
                placeholder="预览 Input 风格..."
              />
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">输入框模式</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatInputMode === 'simple' }"
                @click="chatInputMode = 'simple'"
              >
                简洁
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatInputMode === 'rich' }"
                @click="chatInputMode = 'rich'"
              >
                富文本
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">输入框风格</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatInputStyle === 'wechat' }"
                @click="chatInputStyle = 'wechat'"
              >
                微信
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatInputStyle === 'feishu' }"
                @click="chatInputStyle = 'feishu'"
              >
                飞书
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">输入框功能</label>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <label class="demo-check">
                <input v-model="chatInputFeatures.emoji" type="checkbox" />
                <span>Emoji</span>
              </label>
              <label class="demo-check">
                <input v-model="chatInputFeatures.image" type="checkbox" />
                <span>图片</span>
              </label>
              <label class="demo-check">
                <input v-model="chatInputFeatures.file" type="checkbox" />
                <span>文件</span>
              </label>
              <label class="demo-check">
                <input v-model="chatInputFeatures.voice" type="checkbox" />
                <span>语音</span>
              </label>
              <label class="demo-check">
                <input v-model="chatInputFeatures.video" type="checkbox" />
                <span>视频</span>
              </label>
              <label class="demo-check">
                <input v-model="chatInputFeatures.mention" type="checkbox" />
                <span>@提及</span>
              </label>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">输入框扩展配置</label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <label class="demo-check">
                <input v-model="chatInputAutoFocus" type="checkbox" />
                <span>自动聚焦</span>
              </label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">聚焦边框色</span>
                <input
                  v-model="chatInputFocusBorderColor"
                  placeholder="默认主题色"
                  class="demo-input"
                  style="flex: 1;"
                />
                <div
                  v-if="chatInputFocusBorderColor"
                  style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb;"
                  :style="{ backgroundColor: chatInputFocusBorderColor }"
                />
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">光标颜色</span>
                <input
                  v-model="chatInputCaretColor"
                  placeholder="默认"
                  class="demo-input"
                  style="flex: 1;"
                />
                <div
                  v-if="chatInputCaretColor"
                  style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb;"
                  :style="{ backgroundColor: chatInputCaretColor }"
                />
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">选中背景色</span>
                <input
                  v-model="chatInputSelectionColor"
                  placeholder="默认"
                  class="demo-input"
                  style="flex: 1;"
                />
                <div
                  v-if="chatInputSelectionColor"
                  style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb;"
                  :style="{ backgroundColor: chatInputSelectionColor }"
                />
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">最大长度</span>
                <input
                  v-model.number="chatInputMaxLength"
                  type="number"
                  placeholder="0=无限制"
                  class="demo-input"
                  style="flex: 1;"
                />
              </div>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">群已读回执</label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <label class="demo-check">
                <input v-model="groupReadReceiptEnabled" type="checkbox" />
                <span>启用群已读回执</span>
              </label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">人数上限</span>
                <input
                  v-model.number="groupReadReceiptMaxSize"
                  type="number"
                  placeholder="200"
                  class="demo-input"
                  style="flex: 1;"
                />
              </div>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">消息列表</label>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div>
                <span style="font-size: 13px; color: var(--uikit-text-secondary); display: block; margin-bottom: 6px;">时间戳显示</span>
                <div class="demo-settings__options">
                  <button
                    class="demo-option"
                    :class="{ 'demo-option--active': chatShowTime === false }"
                    @click="chatShowTime = false"
                  >
                    关闭
                  </button>
                  <button
                    class="demo-option"
                    :class="{ 'demo-option--active': chatShowTime === true || chatShowTime === 'always' }"
                    @click="chatShowTime = 'always'"
                  >
                    始终显示
                  </button>
                  <button
                    class="demo-option"
                    :class="{ 'demo-option--active': chatShowTime === 'hover' }"
                    @click="chatShowTime = 'hover'"
                  >
                    悬停显示
                  </button>
                </div>
              </div>

              <div>
                <span style="font-size: 13px; color: var(--uikit-text-secondary); display: block; margin-bottom: 6px;">发送状态</span>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label class="demo-check">
                    <input v-model="chatMessageStatusShowText" type="checkbox" />
                    <span>显示状态文本</span>
                  </label>
                  <div class="demo-settings__options">
                    <button
                      class="demo-option"
                      :class="{ 'demo-option--active': chatMessageStatusDirection === 'horizontal' }"
                      @click="chatMessageStatusDirection = 'horizontal'"
                    >
                      横向排列
                    </button>
                    <button
                      class="demo-option"
                      :class="{ 'demo-option--active': chatMessageStatusDirection === 'vertical' }"
                      @click="chatMessageStatusDirection = 'vertical'"
                    >
                      纵向排列
                    </button>
                  </div>
                  <div class="demo-settings__options">
                    <button
                      class="demo-option"
                      :class="{ 'demo-option--active': chatMessageStatusPosition === 'below' }"
                      @click="chatMessageStatusPosition = 'below'"
                    >
                      状态在下方
                    </button>
                    <button
                      class="demo-option"
                      :class="{ 'demo-option--active': chatMessageStatusPosition === 'inline' }"
                      @click="chatMessageStatusPosition = 'inline'"
                    >
                      状态同行
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">语言</label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': locale === 'zh-CN' }"
                @click="setLocale('zh-CN')"
              >
                中文
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': locale === 'en' }"
                @click="setLocale('en')"
              >
                English
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">会话数据</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <button
                class="demo-btn"
                @click="injectMockConversations"
              >
                注入1000条会话
              </button>
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">联系人演示（拼音能力）</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <button class="demo-btn" @click="injectMockContacts">
                注入 mock 联系人
              </button>
              <button
                class="demo-btn"
                :class="{ 'demo-btn--active': pinyinAdapterEnabled }"
                @click="togglePinyinAdapter(!pinyinAdapterEnabled)"
              >
                {{ pinyinAdapterEnabled ? '已启用拼音 adapter' : '启用拼音 adapter' }}
              </button>
            </div>
            <div class="demo-info">
              关闭时：中文全部归入 # 分组，只能原文搜索。<br />
              开启后：按拼音首字母分组（张三 → Z），支持输入 zhang / zs 搜索。
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">联系人搜索控制</label>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label class="demo-check">
                <input v-model="showHomeSearch" type="checkbox" />
                <span>展示 home 视图搜索</span>
              </label>
              <label class="demo-check">
                <input v-model="showContactSearch" type="checkbox" />
                <span>展示联系人子视图搜索</span>
              </label>
              <label class="demo-check">
                <input v-model="showGroupSearch" type="checkbox" />
                <span>展示群组子视图搜索</span>
              </label>
            </div>
            <div class="demo-info">
              独立控制各视图搜索框显隐。全关则使用 :show-search="false" 统一关闭。
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">Provider 能力开关</label>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label class="demo-check">
                <input
                  type="checkbox"
                  :checked="props.enableContact"
                  @change="toggleEnableContact(($event.target as HTMLInputElement).checked)"
                />
                <span>enableContact 拉取好友列表 / 事件</span>
              </label>
              <label class="demo-check">
                <input
                  type="checkbox"
                  :checked="props.enableBlocklist"
                  @change="toggleEnableBlocklist(($event.target as HTMLInputElement).checked)"
                />
                <span>enableBlocklist 拉取黑名单 / 事件</span>
              </label>
              <label class="demo-check">
                <input
                  type="checkbox"
                  :checked="props.enablePresence"
                  @change="toggleEnablePresence(($event.target as HTMLInputElement).checked)"
                />
                <span>enablePresence 按需订阅在线状态</span>
              </label>
              <label class="demo-check">
                <input
                  type="checkbox"
                  :checked="props.useCustomDataSource"
                  @change="toggleCustomDataSource(($event.target as HTMLInputElement).checked)"
                />
                <span>使用自定义 dataSource（业务接管 fetchContacts）</span>
              </label>
            </div>
            <div class="demo-info">
              默认 enableContact / enableBlocklist / enablePresence 开启。关闭对应开关后，登录后 Provider 不再拉取对应列表/事件。<br />
              启用自定义 dataSource 后，拉好友将走示例接口（返回 Alice/Bob）而非 SDK。
            </div>
          </div>

          <div class="demo-settings__group">
            <label class="demo-settings__label">SDK 初始化（延迟初始化验证）</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <input
                v-model="sdkAppKey"
                placeholder="appKey"
                class="demo-input"
                style="width: 160px;"
              />
              <input
                v-model="sdkApiUrl"
                placeholder="apiUrl (可选)"
                class="demo-input"
                style="width: 160px;"
              />
              <label class="demo-check">
                <input v-model="sdkDebug" type="checkbox" />
                <span>debug</span>
              </label>
              <button
                class="demo-btn"
                :disabled="!sdkAppKey || !!client"
                @click="handleInit"
              >
                {{ client ? '已初始化' : '初始化 SDK' }}
              </button>
            </div>
          </div>

          <div v-if="client" class="demo-settings__group">
            <label class="demo-settings__label">
              SDK 登录
              <span
                class="demo-status-dot"
                :class="connected ? 'demo-status-dot--on' : 'demo-status-dot--off'"
              />
              <span class="demo-status-text">
                {{ connected ? '已连接' : '未连接' }} |
                {{ isLoggedIn ? '已登录' : '未登录' }}
                <template v-if="currentUser">| 用户: {{ currentUser }}</template>
              </span>
            </label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <input
                v-model="loginUser"
                placeholder="用户名"
                class="demo-input"
                style="width: 120px;"
              />
              <template v-if="loginMode === 'password'">
                <input
                  v-model="loginPassword"
                  placeholder="密码"
                  type="password"
                  class="demo-input"
                  style="width: 120px;"
                />
              </template>
              <template v-else>
                <input
                  v-model="loginToken"
                  placeholder="accessToken"
                  class="demo-input"
                  style="width: 140px;"
                />
              </template>
              <button
                class="demo-btn"
                :class="{ 'demo-btn--active': loginMode === 'password' }"
                @click="loginMode = 'password'"
              >
                密码
              </button>
              <button
                class="demo-btn"
                :class="{ 'demo-btn--active': loginMode === 'token' }"
                @click="loginMode = 'token'"
              >
                Token
              </button>
              <button
                class="demo-btn"
                :disabled="!loginUser || isLoggedIn"
                @click="handleLogin"
              >
                登录
              </button>
              <button
                class="demo-btn"
                :disabled="!isLoggedIn"
                @click="handleLogout"
              >
                登出
              </button>
            </div>
            <div v-if="sdkClient" class="demo-info">
              sdkClient 实例: {{ sdkClient.constructor.name }}
            </div>
          </div>
        </div>
      </div>
    </EmPopup>

    <!-- 添加好友 / 创建群组 / 名片弹窗 -->
    <EmAddContactModal v-model:show="showAddContactModal" />
    <EmCreateGroupModal v-model:show="showCreateGroupModal" />
    <EmUserCardModal v-model:show="showCardModal" :user-id="showCardUserId" @send-message="enterChatWithUser" />
    <DemoCardPickerModal
      v-model:show="showCardPickerModal"
      :own-user-id="currentUser || undefined"
      :contacts="stores.contact.contactList"
      @select="sendCard"
    />
  </div>
</template>

<style scoped>
.demo-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  overflow: hidden;
  gap: var(--uikit-container-gap, 8px);
  padding: var(--uikit-container-gap, 8px);
  box-sizing: border-box;
}

.demo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn:hover {
  opacity: 0.85;
}

.demo-btn--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-btn--icon {
  width: 32px;
  padding: 0;
}

.demo-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--uikit-components-radius, 6px);
  background: none;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    color var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

.demo-toolbar-btn:hover {
  background-color: var(--uikit-bg-hover);
  color: var(--uikit-text-primary);
}

.demo-drawer {
  width: 380px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base, #ffffff);
}

.demo-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  flex-shrink: 0;
}

.demo-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.demo-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.demo-settings__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-settings__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--uikit-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.demo-settings__options {
  display: flex;
  gap: 8px;
}

.demo-option {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  background-color: transparent;
  color: var(--uikit-text-primary, #111827);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-option:hover {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-option--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: #ffffff;
}

.demo-settings__color {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 3px;
  background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
  outline: none;
}

.demo-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--uikit-primary-color, hsl(203, 100%, 60%));
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.demo-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--uikit-primary-color, hsl(203, 100%, 60%));
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.demo-color-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--uikit-bg-secondary, #e5e7eb);
  flex-shrink: 0;
}

.demo-layout__sidebar {
  width: 300px;
  flex-shrink: 0;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: auto;
  height: 100%;
  background-color: var(--uikit-bg-base, #ffffff);
}

.demo-layout__main {
  flex: 1;
  min-width: 0;
  overflow: auto;
  height: 100%;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-base, #ffffff);
}

.demo-input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  background-color: var(--uikit-bg-base, #ffffff);
  color: var(--uikit-text-primary, #111827);
  font-size: 13px;
  outline: none;
}

.demo-input:focus {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
}

.demo-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 8px;
  background-color: #ef4444;
}

.demo-status-dot--on {
  background-color: #22c55e;
}

.demo-status-text {
  margin-left: 6px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

.demo-info {
  margin-top: 6px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

/* ===== H5 单栏布局 ===== */

.h5-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--uikit-bg-base, #ffffff);
  overflow: hidden;
}

.h5-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  padding-top: calc(var(--uikit-safe-top, 0px) + 8px);
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
  min-height: 44px;
}

.h5-page__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.h5-page__header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
  padding: 0;
}

.h5-page__header-btn:active {
  background-color: var(--uikit-bg-hover, #e5e7eb);
}

.h5-page__header-spacer {
  width: 36px;
}

.h5-page__body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* H5 底部 TabBar */
.h5-tabbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 50px;
  padding-bottom: var(--uikit-safe-bottom, 0px);
  border-top: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base, #ffffff);
  flex-shrink: 0;
}

.h5-tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--uikit-text-tertiary, #9ca3af);
  cursor: pointer;
  padding: 4px 16px;
  transition: color var(--uikit-anim-duration, 300ms) var(--uikit-anim-easing, ease);
}

.h5-tabbar__item--active {
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.h5-tabbar__label {
  font-size: 11px;
  line-height: 1;
}

/* H5 设置抽屉宽度适配 */
@media (max-width: 767px) {
  .demo-drawer {
    width: 100vw;
    max-height: 80vh;
    border-radius: 12px 12px 0 0;
  }
}
</style>
