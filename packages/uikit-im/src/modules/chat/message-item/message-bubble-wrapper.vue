<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import { EmAvatar as Avatar, CONVERSATION_TYPE, EmCheckbox as Checkbox, INJECTION_KEY, EmIcon as Icon, MESSAGE_STATUS, MESSAGE_TYPE, EmPopup as Popup, useClientStore, useLocale, usePresence } from '@easemob-community/uikit-core'
import type { LocationMessageBody, MessageStatusValue, PresenceDisplayStatus, UiMessage } from '@easemob-community/uikit-core'
import { normalizeUserId } from '@easemob-community/uikit-sdk-contract'
import QuoteCard from '../quote/quote-card.vue'
import type { ChatConfig, MessageActionEvent, MessageLayout, MessageStatusConfig, TimeDisplayStrategy } from '../types'
import { useGroupStore } from '../../../store/group'
import { type MsgQuotePayload, useQuote } from '../../../composables/use-quote'
import { useUIKit } from '../../../composables/use-uikit'
import { useUserInfo } from '../../../composables/use-user-info'
import CombineMessageModal from './combine-message-modal.vue'
import MessageInteractive from './message-interactive.vue'
import MessageRenderer from './message-renderer.vue'
import VoiceTranscript from './voice-transcript.vue'

export interface MessageBubbleWrapperProps {
  message: UiMessage
  /** 消息列表配置 */
  config?: ChatConfig['messageList']
  /** 消息操作菜单配置 */
  actionConfig?: ChatConfig['messageAction']
  /** 群已读回执配置 */
  groupReadReceiptConfig?: ChatConfig['groupReadReceipt']
  /** 是否处于多选模式 */
  isMultiSelectMode?: boolean
  /** 当前消息是否被选中 */
  isSelected?: boolean
  /**
   * 是否为单聊中最新一条己方已读消息（由消息列表计算传入）。
   * 缺省 true：独立场景（合并转发弹窗/搜索结果等）保持每条都展示已读 icon 的旧行为。
   */
  isLatestReadSelf?: boolean
}

export interface MessageBubbleWrapperEmits {
  (e: 'toggle-select', messageId: string): void
  (e: 'action', event: MessageActionEvent): void
  (e: 'group-read-click', msgId: string, groupId: string): void
  (e: 'reedit', message: UiMessage): void
  (e: 'resend', message: UiMessage): void
  (e: 'mention-click', userId: string): void
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
  (e: 'avatar-view-profile', userId: string, anchor?: HTMLElement): void
  (e: 'avatar-click', userId: string, anchor?: HTMLElement): void
  (e: 'avatar-mention', payload: { userId: string, name: string }): void
}

/** 弹窗中嵌套合并消息的层级栈 */
interface ModalState {
  show: boolean
  message: UiMessage | null
}

const props = defineProps<MessageBubbleWrapperProps>()

const emit = defineEmits<MessageBubbleWrapperEmits>()

const modalStack = ref<ModalState[]>([])

/** 打开合并消息弹窗 */
function openCombineModal(message: UiMessage) {
  modalStack.value.push({ show: true, message })
}

/** 关闭指定层弹窗 */
function closeModalAt(index: number) {
  if (index >= 0 && index < modalStack.value.length) {
    modalStack.value[index].show = false
    // 延迟移除，让关闭动画完成
    setTimeout(() => {
      modalStack.value.splice(index, 1)
    }, 300)
  }
}

/** 处理嵌套合并消息点击 */
function onViewCombine(message: UiMessage) {
  openCombineModal(message)
}

const { t } = useLocale()

const clientStore = useClientStore()

const { capabilities, features } = useUIKit()

const { displayName, avatarUrl } = useUserInfo(() => props.message.from)
const { get: getPresence } = usePresence()

/**
 * 消息是否为己方发送。
 * 渲染层以当前登录用户实时校准：解决登录时序/多端登录/资源后缀等场景下
 * adapter 阶段计算出的 isSelf 与当前身份不一致的问题（偶现己方消息出现在左侧）。
 */
const isSelf = computed(() => {
  const from = props.message.from
  const currentUserId = clientStore.currentUser
  if (from && currentUserId) {
    return normalizeUserId(from) === normalizeUserId(currentUserId)
  }
  return props.message.isSelf
})

/**
 * 发送者在线状态：默认不展示（消息流头像不带状态点，见 config.messageList.presence，
 * 默认 false）；显式开启且全局 enablePresence 链路可用时，对方头像展示状态点
 * （自己的在线状态对自己没有信息量，己方消息永不展示）。
 */
const senderPresence = computed<PresenceDisplayStatus | undefined>(() => {
  if (!props.config?.presence || !features.enablePresence)
    return undefined
  if (isSelf.value)
    return undefined
  return getPresence(props.message.from).value?.status as PresenceDisplayStatus | undefined
})

/** 是否为通知类型消息 */
const isNotice = computed(() => (props.message.type as string) === MESSAGE_TYPE.NOTICE)

/** 是否为已撤回消息 */
const isRecalled = computed(() => props.message.recalled)

/** 撤回提示文案 */
const recalledText = computed(() => {
  const from = displayName.value || props.message.from || ''
  return `${from} ${t('message.recalled') ?? '撤回了一条消息'}`
})

const groupStore = useGroupStore()
const { highlightedMessageId, requestLocate } = useQuote()

/** 布局模式 */
const layout = computed<MessageLayout>(() => props.config?.layout ?? 'conversation')

/**
 * 是否显示头像。
 * showAvatar 是总开关（默认 true，关闭后自己与对方头像均隐藏）；
 * showSelfAvatar 仅在 showAvatar 开启时单独控制己方消息头像（默认 true），
 * 设为 false 即隐藏自己的头像而对方头像照常显示（微信/QQ 式「隐藏我的头像」）。
 */
const showAvatar = computed(() => {
  const global = props.config?.showAvatar ?? true
  if (!global)
    return false
  return isSelf.value ? (props.config?.showSelfAvatar ?? true) : true
})

/** 是否显示时间 */
const showTime = computed<TimeDisplayStrategy>(() => props.config?.showTime ?? false)

/** 是否为对话模式且是己方消息 */
const isSelfConversation = computed(() => layout.value === 'conversation' && isSelf.value)

/**
 * 是否展示发送者昵称。
 * 己方消息永远不展示；对方消息按会话类型走 features 开关（运行时切换即刻生效）：
 * 群聊默认展示（showNicknameInGroupChat，默认 true），单聊默认隐藏（showNicknameInSingleChat，默认 false）。
 * 以消息自身的 conversationType 判定，合并转发弹窗 / 搜索结果等独立场景同样适用。
 */
const showNickname = computed(() => {
  if (isSelf.value)
    return false
  if (props.message.conversationType === CONVERSATION_TYPE.GROUPCHAT)
    return features.showNicknameInGroupChat ?? true
  return features.showNicknameInSingleChat ?? false
})

/** 头像尺寸 */
const avatarSize = computed(() => props.config?.avatarSize ?? 32)

/** 气泡形状：config.messageList.bubbleShape 优先于主题全局 bubbleShape，气泡组件 inject 消费 */
const bubbleShape = computed(() => props.config?.bubbleShape)
provide(INJECTION_KEY.BUBBLE_SHAPE, bubbleShape)

/** 语音未读红点开关：config.messageList.voiceUnreadDot，voice-message inject 消费（undefined 回落默认 true） */
const voiceUnreadDot = computed(() => props.config?.voiceUnreadDot)
provide(INJECTION_KEY.VOICE_UNREAD_DOT, voiceUnreadDot)

/** 格式化后的时间（HH:mm） */
const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

/** 是否显示时间标签 */
const shouldShowTime = computed(() => {
  if (showTime.value === false)
    return false
  return true // 'always' | 'hover' | true 都默认显示，hover 样式通过 CSS 控制
})

/** 消息状态 */
const messageStatus = computed(() => props.message.status)

/** 群聊已读回执是否激活（用圆圈替代普通状态）。发送失败消息优先展示失败重发图标，不走已读回执。 */
const isGroupReadReceiptActive = computed(() => {
  if (!isSelf.value || props.message.conversationType !== CONVERSATION_TYPE.GROUPCHAT)
    return false
  // 发送失败时强制展示经典失败状态，避免已读圆圈为空导致用户看不到发送结果
  if (messageStatus.value === MESSAGE_STATUS.FAILED)
    return false
  // 全局已读回执开关关闭时不展示（Prod 集群已读回执问题临时止血开关）
  if (features.enableReadReceipt === false)
    return false
  // 配置显式关闭时不展示已读回执，优先于消息自身回执数据，保证开关关闭即时生效
  // （enabled 为 undefined 的调用方保持旧行为：已带 requireGroupAck / groupReadCount 的消息仍激活）
  if (props.groupReadReceiptConfig?.enabled === false)
    return false
  // 消息本身已请求回执或已有回执数据，直接激活
  if (props.message.requireGroupAck || (props.message.groupReadCount ?? 0) > 0)
    return true
  // 配置开启时，群聊己方消息默认激活（兼容历史消息与未收到回执的新消息）；
  // 与 SDK 客观能力取交集：adapter 上报 groupReadReceipt=false 时不按配置激活
  return capabilities.groupReadReceipt !== false && props.groupReadReceiptConfig?.enabled === true
})

/** 是否显示群已读人数标注 */
const showGroupReadCount = computed(() => isGroupReadReceiptActive.value)

/**
 * 图片/视频发送中：loading 已由气泡内蒙层居中展示（image-message / video-message），
 * 抑制气泡旁的小状态 loading，避免双 spinner；失败/已读等其他状态不受影响。
 */
const isMediaSending = computed(() =>
  messageStatus.value === MESSAGE_STATUS.SENDING
  && (props.message.type === MESSAGE_TYPE.IMAGE || props.message.type === MESSAGE_TYPE.VIDEO),
)

/**
 * 已读回执全局开关关闭时，投递/已读类状态（SENT/DELIVERED/READ）整体隐藏：
 * 这些状态的 UI 载体（空心圆/已读对勾/群已读数）即「已读未读」展示层，
 * 关闭已读回执后不应再残留任何状态指示（Prod 集群已读回执问题临时止血开关）。
 * 发送中 spinner / 失败重试属本地操作反馈，不受影响。
 */
const hideStatusByReceiptSwitch = computed(() =>
  features.enableReadReceipt === false
  && (messageStatus.value === MESSAGE_STATUS.SENT
    || messageStatus.value === MESSAGE_STATUS.DELIVERED
    || messageStatus.value === MESSAGE_STATUS.READ),
)

/** 是否显示发送状态（仅自己的消息；群聊已读回执激活时用圆圈替代） */
const showStatus = computed(() =>
  isSelf.value && !isGroupReadReceiptActive.value && !hideStatusByReceiptSwitch.value,
)

/** 消息状态展示配置 */
const statusConfig = computed<MessageStatusConfig>(() => props.config?.messageStatus || {})

/**
 * 单聊已读 icon 收敛（仿抖音）：readIconDisplay 默认 'latest' 时，
 * 连续已读只在最新一条已读消息上展示已读状态，其余已读消息隐藏。
 * 仅影响 READ 状态；未读（sent/delivered）/发送中/失败照常逐条展示。
 */
const hideReadStatus = computed(() => {
  if (props.message.conversationType === CONVERSATION_TYPE.GROUPCHAT)
    return false
  if (messageStatus.value !== MESSAGE_STATUS.READ)
    return false
  // 全局已读回执开关关闭时隐藏单聊已读 icon（Prod 集群已读回执问题临时止血开关）
  if (features.enableReadReceipt === false)
    return true
  if ((statusConfig.value.readIconDisplay ?? 'latest') !== 'latest')
    return false
  return props.isLatestReadSelf === false
})

/** 实际展示状态：showStatus 减去「单聊已读收敛」隐藏的情形 */
const showStatusEffective = computed(() => showStatus.value && !hideReadStatus.value && !isMediaSending.value)

/** 经典状态图标映射（默认） */
const classicStatusIconMap: Record<MessageStatusValue, string> = {
  // 发送中：小尺寸（14px）使用小弧 loading 图标，避免大弧在小尺寸下拥挤
  [MESSAGE_STATUS.SENDING]: 'loading/arc/normal',
  // 未读（已发送/已送达）：主题色空心圆
  [MESSAGE_STATUS.SENT]: 'circle/empty-1',
  [MESSAGE_STATUS.DELIVERED]: 'circle/empty-1',
  // 已读：灰色打勾圆
  [MESSAGE_STATUS.READ]: 'circle/checked',
  // 发送失败：圆圈内感叹号提示可点击重发
  [MESSAGE_STATUS.FAILED]: 'circle/bang',
}

/**
 * 数字胶囊状态图标映射（线性/描边版）
 * 语义：未读=空心圆，已读=空心圆+对勾；发送中/失败保持经典图标
 */
const capsuleStatusIconMap: Record<MessageStatusValue, string> = {
  [MESSAGE_STATUS.SENDING]: 'loading/arc/normal',
  [MESSAGE_STATUS.SENT]: 'circle/empty-1',
  [MESSAGE_STATUS.DELIVERED]: 'circle/empty-1',
  [MESSAGE_STATUS.READ]: 'circle/checked',
  [MESSAGE_STATUS.FAILED]: 'circle/bang',
}

/** 当前状态图标 */
const statusIcon = computed(() => {
  const cfg = statusConfig.value.iconMap
  if (cfg?.[messageStatus.value as MessageStatusValue])
    return cfg[messageStatus.value as MessageStatusValue]!
  const map = statusConfig.value.style === 'capsule' ? capsuleStatusIconMap : classicStatusIconMap
  return map[messageStatus.value as MessageStatusValue]
})

/** PC 端发送失败图标 hover 时显示的替换图标（重发提示） */
const failedHoverIcon = 'ringarrow/cw'

/** 当前状态文本 */
const statusText = computed(() => {
  const cfg = statusConfig.value.textMap
  return cfg?.[messageStatus.value as MessageStatusValue]
    ?? t(`message.status.${messageStatus.value}`)
    ?? messageStatus.value
})

/** 是否显示状态文本 */
const showStatusText = computed(() => statusConfig.value.showText ?? false)

/** 状态区域排列方向 */
const statusDirection = computed(() => statusConfig.value.direction ?? 'horizontal')

/** 状态相对气泡位置：默认 'inline'（气泡末尾、多行气泡时与底部对齐），设计规范默认 */
const statusPosition = computed(() => statusConfig.value.position ?? 'inline')

/** 是否为语音消息 */
const isVoiceMessage = computed(() => props.message.type === MESSAGE_TYPE.VOICE)

/**
 * 语音转文字胶囊外置渲染：状态与气泡同行（inline / 群已读回执强制同行）时，
 * 胶囊由本组件在 message-row 外渲染（与 QuoteCard 同理），voice-message 内部不再渲染，
 * 状态列只相对气泡本体对齐，避免落在胶囊/「已转文字」标签区域。
 * 'below' 分支状态本就在最下方，胶囊留在 voice-message 内部渲染。
 */
const voiceTranscriptExternal = computed(() =>
  isVoiceMessage.value && (statusPosition.value !== 'below' || showGroupReadCount.value),
)
provide(INJECTION_KEY.VOICE_TRANSCRIPT_EXTERNAL, voiceTranscriptExternal)

/** 气泡主体 ref（用于判断单行/多行） */
const bodyRef = ref<HTMLElement>()
/** 状态列 ref */
const statusColumnRef = ref<HTMLElement>()
/** 是否多行气泡 */
const isBodyMultiLine = ref(false)

/** 根据 body 与状态列高度判断是否多行 */
function checkMultiLine() {
  const body = bodyRef.value
  const statusColumn = statusColumnRef.value
  if (!body || !statusColumn) {
    isBodyMultiLine.value = false
    return
  }
  // 气泡明显高于状态列时视为多行，此时状态列沉底对齐
  isBodyMultiLine.value = body.clientHeight > statusColumn.clientHeight + 8
}

let alignmentObserver: ResizeObserver | null = null

/**
 * 重建对齐观察：同步先算一次多行，再观察气泡主体与状态列两者。
 * 状态列是 v-if 按需渲染的（发送中媒体消息/单聊已读收敛等场景挂载时不存在），
 * 若只观察 body，列出现而 body 尺寸不变（图片显式 px 尺寸）时多行检测不会重算，
 * 状态列会停在 align-self: center 垂直居中——必须随 ref 出现/消失重建观察。
 */
function observeAlignment() {
  alignmentObserver?.disconnect()
  alignmentObserver = null
  const body = bodyRef.value
  if (!body || typeof ResizeObserver === 'undefined')
    return
  checkMultiLine()
  alignmentObserver = new ResizeObserver(checkMultiLine)
  alignmentObserver.observe(body)
  if (statusColumnRef.value)
    alignmentObserver.observe(statusColumnRef.value)
}

watch([bodyRef, statusColumnRef], () => {
  nextTick(observeAlignment)
}, { flush: 'post' })

/** 点击状态：失败时触发重发 */
function onStatusClick() {
  if (messageStatus.value === MESSAGE_STATUS.FAILED) {
    emit('resend', props.message)
  }
}

/** 群成员总数（优先取消息缓存，其次从 groupStore 查） */
const groupMemberCount = computed(() => {
  return props.message.groupMemberCount
    || groupStore.getGroupById(props.message.to || props.message.conversationId)?.memberCount
    || 0
})

/** 群已读人数 */
const groupReadCount = computed(() => props.message.groupReadCount || 0)

/** 群已读人数展示文本：超过 999 显示 999+（设计师稿三位数上限） */
const groupReadCountText = computed(() =>
  groupReadCount.value > 999 ? '999+' : String(groupReadCount.value),
)

/** 群未读人数 */
const groupUnreadCount = computed(() =>
  groupMemberCount.value > 0 ? groupMemberCount.value - groupReadCount.value : 0,
)

/** 群已读是否全部已读 */
const isGroupReadAll = computed(() =>
  groupMemberCount.value > 0 && groupReadCount.value >= groupMemberCount.value,
)

/** 群已读标注点击 */
function onGroupReadClick() {
  if (props.message.conversationType === CONVERSATION_TYPE.GROUPCHAT) {
    emit('group-read-click', props.message.msgServerId, props.message.to || props.message.conversationId)
  }
}

/** 提取引用数据：仅在 ext.msgQuote 存在且具有 msgPreview 时返回 */
const quoteData = computed(() => {
  const ext = (props.message as unknown as { ext?: Record<string, any> }).ext
  const q = ext?.msgQuote
  if (!q || typeof q !== 'object')
    return null
  if (!q.msgPreview)
    return null
  return {
    msgID: String(q.msgID || ''),
    msgPreview: String(q.msgPreview || ''),
    msgSender: String(q.msgSender || ''),
    msgType: String(q.msgType || MESSAGE_TYPE.TEXT),
    msgThumbUrl: String(q.msgThumbUrl || ''),
  } as MsgQuotePayload
})

/** 引用卡片是否展示原消息发送人头像（config.messageList.quote.showAvatar，默认 false） */
const quoteShowAvatar = computed(() => props.config?.quote?.showAvatar ?? false)

/** 点击引用卡片：触发定位/闪烁，列表端 watch locateRequest 处理 */
function onQuoteClick() {
  if (!quoteData.value?.msgID)
    return
  requestLocate(quoteData.value.msgID)
}

/** 当前气泡是否需要闪烁高亮（被其他引用卡片定位到） */
const isHighlighted = computed(() => {
  const target = highlightedMessageId.value
  if (!target)
    return false
  return target === props.message.msgServerId || target === props.message.msgLocalId
})

/** 头像右键菜单显示状态 */
const showAvatarMenu = ref(false)
/** 头像右键菜单锚点元素 */
const avatarMenuAnchor = ref<HTMLElement>()
/** 头像容器元素（左键点击/查看资料时作为名片弹层的锚点） */
const avatarContainerRef = ref<HTMLElement>()

/** 是否在群聊中（@提及仅群聊展示） */
const isGroupChat = computed(() => props.message.conversationType === CONVERSATION_TYPE.GROUPCHAT)

/** 右键点击头像：弹出资料/ @ 菜单 */
function onAvatarContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  // 清理旧锚点
  if (avatarMenuAnchor.value?.parentNode) {
    avatarMenuAnchor.value.parentNode.removeChild(avatarMenuAnchor.value)
  }
  // 在鼠标位置创建 1px 锚点
  const anchor = document.createElement('div')
  anchor.style.position = 'fixed'
  anchor.style.left = `${event.clientX}px`
  anchor.style.top = `${event.clientY}px`
  anchor.style.width = '1px'
  anchor.style.height = '1px'
  anchor.style.pointerEvents = 'none'
  document.body.appendChild(anchor)
  avatarMenuAnchor.value = anchor
  showAvatarMenu.value = true
}

/** 关闭头像右键菜单并清理锚点 */
function closeAvatarMenu() {
  showAvatarMenu.value = false
  nextTick(() => {
    if (avatarMenuAnchor.value?.parentNode) {
      avatarMenuAnchor.value.parentNode.removeChild(avatarMenuAnchor.value)
    }
    avatarMenuAnchor.value = undefined
  })
}

/** 查看资料 */
function onViewProfileFromAvatar() {
  closeAvatarMenu()
  emit('avatar-view-profile', props.message.from, avatarContainerRef.value)
}

/** 左键点击头像：查看资料（多选模式下不拦截，保持整行点击切换选中） */
function onAvatarLeftClick(event: MouseEvent) {
  if (props.isMultiSelectMode)
    return
  if (props.config?.avatarClickViewProfile === false)
    return
  event.stopPropagation()
  emit('avatar-click', props.message.from, avatarContainerRef.value)
}

/** @ 该用户 */
function onMentionFromAvatar() {
  closeAvatarMenu()
  emit('avatar-mention', { userId: props.message.from, name: displayName.value || props.message.from })
}

onBeforeUnmount(() => {
  alignmentObserver?.disconnect()
  if (avatarMenuAnchor.value?.parentNode) {
    avatarMenuAnchor.value.parentNode.removeChild(avatarMenuAnchor.value)
  }
})
</script>

<template>
  <div
    class="message-bubble-wrapper"
    :data-msg-id="props.message.msgServerId || props.message.msgLocalId"
    :class="{
      'message-bubble-wrapper--self': isSelfConversation,
      'message-bubble-wrapper--left': layout === 'left',
      'message-bubble-wrapper--hover-time': showTime === 'hover',
      'message-bubble-wrapper--selected': props.isSelected,
      'message-bubble-wrapper--recalled': isRecalled,
      'message-bubble-wrapper--highlight': isHighlighted,
    }"
    @click="props.isMultiSelectMode && emit('toggle-select', props.message.msgServerId || props.message.msgLocalId)"
  >
    <!-- 通知类型消息：居中灰色提示，不显示头像/昵称/气泡 -->
    <template v-if="isNotice">
      <!-- 有 #message-notice 插槽：委托 MessageRenderer 让业务完全接管渲染 -->
      <MessageRenderer
        v-if="$slots['message-notice']"
        :message="message"
      >
        <!-- 透传所有类型级插槽 -->
        <template
          v-for="(_, name) in $slots"
          :key="name"
          #[name]="slotProps"
        >
          <slot :name="name" v-bind="slotProps" />
        </template>
      </MessageRenderer>
      <!-- 无插槽：保持既有默认渲染，样式零漂移 -->
      <div v-else class="message-bubble-wrapper__notice">
        {{ (message.body as any).content || (message as any).content || '' }}
      </div>
    </template>

    <!-- 已撤回消息：居中灰色提示，不显示头像/昵称/气泡 -->
    <template v-else-if="isRecalled">
      <div class="message-bubble-wrapper__recalled">
        <span class="message-bubble-wrapper__recalled-text">{{ recalledText }}</span>
        <!-- 文本消息重新编辑按钮 -->
        <MessageRenderer
          v-if="message.type === MESSAGE_TYPE.TEXT && isSelf && message.originalMsg"
          :message="message"
          @reedit="emit('reedit', $event)"
        />
      </div>
    </template>

    <template v-else>
      <!-- 多选 Checkbox：微信风格，所有消息统一放在最左侧（独立于内层 row-reverse 之外） -->
      <div v-if="props.isMultiSelectMode" class="message-bubble-wrapper__checkbox">
        <Checkbox :checked="props.isSelected" :size="18" />
      </div>

      <!-- 主体区域：处理己方/对方头像+内容布局 -->
      <div
        class="message-bubble-wrapper__main"
        :class="{
          'message-bubble-wrapper__main--self': isSelfConversation,
          'message-bubble-wrapper__main--left': layout === 'left',
        }"
      >
        <!-- 头像区域 -->
        <div v-if="showAvatar" ref="avatarContainerRef" class="message-bubble-wrapper__avatar" @click="onAvatarLeftClick" @contextmenu.stop="onAvatarContextMenu">
          <slot name="avatar" :message="message">
            <Avatar :name="displayName" :src="avatarUrl" :size="avatarSize" :presence="senderPresence" />
          </slot>
        </div>

        <!-- 内容区域 -->
        <div class="message-bubble-wrapper__content">
          <!-- 昵称 -->
          <div v-if="showNickname" class="message-bubble-wrapper__nickname">
            <slot name="nickname" :message="message">
              {{ displayName }}
            </slot>
          </div>

          <!-- ===== 状态在气泡下方（position: 'below'，历史行为） ===== -->
          <template v-if="statusPosition === 'below' && !showGroupReadCount">
            <!-- 消息渲染器 -->
            <div class="message-bubble-wrapper__body">
              <!-- 置顶角标 -->
              <div
                v-if="message.pinned"
                class="message-bubble-wrapper__pin-badge"
                :title="t('message.action.pin')"
              >
                <Icon name="pin" :size="12" />
                <span>{{ t('message.action.pin') }}</span>
              </div>
              <MessageInteractive
                :message="message"
                :config="actionConfig"
                @action="emit('action', $event)"
              >
                <MessageRenderer
                  :message="message"
                  @reedit="emit('reedit', $event)"
                  @view-combine="onViewCombine"
                  @mention-click="emit('mention-click', $event)"
                  @location-click="emit('location-click', $event, message)"
                  @custom-message-action="(action, payload) => emit('custom-message-action', action, payload, message)"
                >
                  <!-- 透传所有类型级插槽 -->
                  <template
                    v-for="(_, name) in $slots"
                    :key="name"
                    #[name]="slotProps"
                  >
                    <slot :name="name" v-bind="slotProps" />
                  </template>
                </MessageRenderer>
                <template #message-action-menu="slotProps">
                  <slot name="message-action-menu" v-bind="slotProps" />
                </template>
                <template #message-action-extra="slotProps">
                  <slot name="message-action-extra" v-bind="slotProps" />
                </template>
              </MessageInteractive>
              <!-- 引用卡片（气泡下方） -->
              <QuoteCard
                v-if="quoteData"
                :quote="quoteData"
                :align-right="isSelfConversation"
                :show-avatar="quoteShowAvatar"
                @click="onQuoteClick"
              />
            </div>

            <!-- 消息状态指示器（仅己方消息） -->
            <div
              v-if="showStatusEffective"
              class="message-bubble-wrapper__status"
              :class="{
                'message-bubble-wrapper__status--vertical': statusDirection === 'vertical',
              }"
            >
              <slot
                name="message-status"
                :status="messageStatus"
                :message="message"
                :text="statusText"
                :icon="statusIcon"
              >
                <span
                  class="message-bubble-wrapper__status-item"
                  :class="{
                    'message-bubble-wrapper__status-item--failed': messageStatus === MESSAGE_STATUS.FAILED,
                  }"
                  :title="statusText"
                  @click.stop="onStatusClick"
                >
                  <Transition name="uikit-status-icon" mode="out-in">
                    <Icon
                      v-if="statusIcon"
                      :key="statusIcon"
                      :name="statusIcon"
                      :size="14"
                      class="message-bubble-wrapper__status-icon"
                      :class="{
                        'message-bubble-wrapper__status-icon--unread': messageStatus === MESSAGE_STATUS.SENT || messageStatus === MESSAGE_STATUS.DELIVERED,
                      }"
                      :anim="messageStatus === MESSAGE_STATUS.SENDING ? 'spin' : undefined"
                    />
                  </Transition>
                  <Icon
                    v-if="messageStatus === MESSAGE_STATUS.FAILED"
                    :name="failedHoverIcon"
                    :size="14"
                    class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--failed-hover"
                  />
                  <span
                    v-if="showStatusText"
                    class="message-bubble-wrapper__status-text"
                  >
                    {{ statusText }}
                  </span>
                </span>
              </slot>
            </div>
          </template>

          <!-- ===== 状态与气泡同一行（默认 inline；群已读回执激活时强制同行） ===== -->
          <template v-else>
          <div
            class="message-bubble-wrapper__message-row"
            :class="{
              'message-bubble-wrapper__message-row--self': isSelfConversation,
              'message-bubble-wrapper__message-row--multiline': isBodyMultiLine,
            }"
          >
            <!-- 消息渲染器 -->
            <div ref="bodyRef" class="message-bubble-wrapper__body">
              <!-- 置顶角标 -->
              <div
                v-if="message.pinned"
                class="message-bubble-wrapper__pin-badge"
                :title="t('message.action.pin')"
              >
                <Icon name="pin" :size="12" />
                <span>{{ t('message.action.pin') }}</span>
              </div>
              <MessageInteractive
                :message="message"
                :config="actionConfig"
                @action="emit('action', $event)"
              >
                <MessageRenderer
                  :message="message"
                  @reedit="emit('reedit', $event)"
                  @view-combine="onViewCombine"
                  @mention-click="emit('mention-click', $event)"
                  @location-click="emit('location-click', $event, message)"
                  @custom-message-action="(action, payload) => emit('custom-message-action', action, payload, message)"
                >
                  <!-- 透传所有类型级插槽 -->
                  <template
                    v-for="(_, name) in $slots"
                    :key="name"
                    #[name]="slotProps"
                  >
                    <slot :name="name" v-bind="slotProps" />
                  </template>
                </MessageRenderer>
                <template #message-action-menu="slotProps">
                  <slot name="message-action-menu" v-bind="slotProps" />
                </template>
                <template #message-action-extra="slotProps">
                  <slot name="message-action-extra" v-bind="slotProps" />
                </template>
              </MessageInteractive>
            </div>

            <!-- 状态列（状态 + 群已读，默认位于己方气泡左侧） -->
            <div
              v-if="showStatusEffective || showGroupReadCount"
              ref="statusColumnRef"
              class="message-bubble-wrapper__status-column"
              :class="{
                'message-bubble-wrapper__status-column--vertical': statusDirection === 'vertical',
              }"
            >
              <div
                v-if="showStatusEffective"
                class="message-bubble-wrapper__status"
                :class="{
                  'message-bubble-wrapper__status--vertical': statusDirection === 'vertical',
                }"
              >
                <slot
                  name="message-status"
                  :status="messageStatus"
                  :message="message"
                  :text="statusText"
                  :icon="statusIcon"
                >
                  <span
                    class="message-bubble-wrapper__status-item"
                    :class="{
                      'message-bubble-wrapper__status-item--failed': messageStatus === MESSAGE_STATUS.FAILED,
                    }"
                    :title="statusText"
                    @click.stop="onStatusClick"
                  >
                    <Icon
                      v-if="statusIcon"
                      :name="statusIcon"
                      :size="14"
                      class="message-bubble-wrapper__status-icon"
                      :class="{
                        'message-bubble-wrapper__status-icon--unread': messageStatus === MESSAGE_STATUS.SENT || messageStatus === MESSAGE_STATUS.DELIVERED,
                      }"
                      :anim="messageStatus === MESSAGE_STATUS.SENDING ? 'spin' : undefined"
                    />
                    <Icon
                      v-if="messageStatus === MESSAGE_STATUS.FAILED"
                      :name="failedHoverIcon"
                      :size="14"
                      class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--failed-hover"
                    />
                    <span
                      v-if="showStatusText"
                      class="message-bubble-wrapper__status-text"
                    >
                      {{ statusText }}
                    </span>
                  </span>
                </slot>
              </div>

              <!-- 群已读人数标注 -->
              <button
                v-if="showGroupReadCount"
                type="button"
                class="message-bubble-wrapper__group-read"
                :class="{
                  'message-bubble-wrapper__group-read--all': isGroupReadAll,
                  'message-bubble-wrapper__group-read--zero': groupReadCount === 0,
                }"
                :title="`${groupReadCount}人已读${groupUnreadCount > 0 ? `/${groupMemberCount}人` : ''}`"
                @click.stop="onGroupReadClick"
              >
                <Icon v-if="isGroupReadAll" name="circle/checked" :size="14" />
                <Icon v-else-if="groupReadCount === 0" name="circle/empty-1" :size="14" />
                <template v-else>
                  {{ groupReadCountText }}
                </template>
              </button>
            </div>
          </div>

          <!-- 语音转文字胶囊（气泡下方；独立于 message-row，inline 状态列只相对气泡对齐，避免落在胶囊区域） -->
          <VoiceTranscript
            v-if="voiceTranscriptExternal"
            :message="message"
          />
          <!-- 引用卡片（气泡下方；独立于 message-row，inline 状态列只相对气泡对齐，避免落在引用卡上） -->
          <QuoteCard
            v-if="quoteData"
            :quote="quoteData"
            :align-right="isSelfConversation"
            :show-avatar="quoteShowAvatar"
            @click="onQuoteClick"
          />
          </template>

          <!-- 时间戳 -->
          <div v-if="shouldShowTime" class="message-bubble-wrapper__time">
            <slot name="time" :message="message">
              {{ formattedTime }}
            </slot>
          </div>
        </div>
      </div>
    </template>

    <!-- 合并消息弹窗栈：支持嵌套合并消息逐层点击 -->
    <CombineMessageModal
      v-for="(modal, idx) in modalStack"
      :key="modal.message?.msgServerId || modal.message?.msgLocalId || idx"
      :show="modal.show"
      :message="modal.message!"
      @update:show="(v: boolean) => { if (!v) closeModalAt(idx) }"
      @view-combine="onViewCombine"
    />

    <!-- 头像右键菜单：查看资料 / @ 提及 -->
    <Popup
      :show="showAvatarMenu"
      :anchor="avatarMenuAnchor"
      placement="right"
      align="start"
      :overlay="false"
      :offset="4"
      @update:show="(v: boolean) => { showAvatarMenu = v; if (!v) closeAvatarMenu() }"
      @close="closeAvatarMenu"
    >
      <div class="avatar-context-menu" @click.stop>
        <div class="avatar-context-menu__item" @click="onViewProfileFromAvatar">
          <Icon name="person/single" :size="16" />
          <span>{{ t('message.avatar.viewProfile') }}</span>
        </div>
        <div v-if="isGroupChat" class="avatar-context-menu__item" @click="onMentionFromAvatar">
          <Icon name="at" :size="16" />
          <span>{{ t('message.avatar.mention') }}</span>
        </div>
      </div>
    </Popup>
  </div>
</template>

<style scoped>
.message-bubble-wrapper {
  display: flex;
  align-items: flex-start;
  gap: var(--uikit-bubble-gap, 8px);
  width: 100%;
  max-width: 100%;
}

/* 全部居左模式 */
.message-bubble-wrapper--left {
  justify-content: flex-start;
}

/* 对话模式：己方消息外层反向（使主体靠右） */
.message-bubble-wrapper--self {
  justify-content: flex-end;
}

/* 内层主体容器：处理头像+内容布局，擑满剩余空间以使 content max-width: 70% 生效 */
.message-bubble-wrapper__main {
  display: flex;
  align-items: flex-start;
  gap: var(--uikit-bubble-gap, 8px);
  min-width: 0;
  flex: 1;
  max-width: 100%;
}

.message-bubble-wrapper__main--left {
  justify-content: flex-start;
}

/* 己方消息：内层反向排列（头像在右，气泡靠右） */
.message-bubble-wrapper--self .message-bubble-wrapper__main {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.message-bubble-wrapper__main--self .message-bubble-wrapper__content {
  align-items: flex-end;
}

.message-bubble-wrapper__avatar {
  flex-shrink: 0;
}

.message-bubble-wrapper__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 70%;
  min-width: 0;
}

.message-bubble-wrapper__nickname {
  font-size: var(--uikit-font-size-11);
  font-weight: var(--uikit-font-weight-medium, 500);
  color: var(--uikit-text-primary, #171A1C);
  padding: 2px 4px;
}

.message-bubble-wrapper__body {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 状态与气泡同一行 */
.message-bubble-wrapper__message-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

/* inline 分支：body 宽度随气泡内容收缩。
   引用卡已移出 message-row 但仍在同一 content 列里，会把列宽撑到引用卡宽度；
   body 若保持 width: 100%，气泡贴 body 边缘、状态列就会被顶到整行另一侧（跟着引用卡宽度走）。
   fit-content 后状态列始终紧贴气泡本体。 */
.message-bubble-wrapper__message-row .message-bubble-wrapper__body {
  width: fit-content;
  max-width: 100%;
}

/* 己方消息：状态列在气泡左侧 */
.message-bubble-wrapper__message-row--self {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

/* 多行气泡：状态列沉底 */
.message-bubble-wrapper__message-row--multiline .message-bubble-wrapper__status-column {
  align-self: flex-end;
}

.message-bubble-wrapper__status-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
  align-self: center;
  min-width: 0;
}

.message-bubble-wrapper__message-row--self .message-bubble-wrapper__status-column {
  align-items: flex-end;
}

.message-bubble-wrapper__status-column--vertical {
  align-items: center;
}

.message-bubble-wrapper__message-row .message-bubble-wrapper__status {
  margin-top: 0;
  padding-left: 0;
}

.message-bubble-wrapper__time {
  font-size: var(--uikit-font-size-10);
  color: var(--uikit-text-secondary);
  margin-top: 2px;
  padding-left: 2px;
}

/* hover 显示时间 */
.message-bubble-wrapper--hover-time .message-bubble-wrapper__time {
  opacity: 0;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .message-bubble-wrapper--hover-time:hover .message-bubble-wrapper__time {
    opacity: 1;
  }
}

/* 多选模式 */
.message-bubble-wrapper__checkbox {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 8px;
}

.message-bubble-wrapper--selected {
  opacity: 0.85;
}

/* 消息状态指示器 */
.message-bubble-wrapper__status {
  display: flex;
  align-items: center;
  margin-top: 2px;
  padding-left: 2px;
  flex-shrink: 0;
}

.message-bubble-wrapper__status-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
}

.message-bubble-wrapper__status-item--failed {
  color: var(--uikit-danger-color);
  cursor: pointer;
  position: relative;
}

.message-bubble-wrapper__status-icon {
  display: inline-flex;
  color: inherit;
}

.message-bubble-wrapper__status-item--failed .message-bubble-wrapper__status-icon {
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

/* 未读（已发送/已送达）：主题色空心圆；已读回落基色灰 */
.message-bubble-wrapper__status-icon--unread {
  color: var(--uikit-primary-color);
}

/* PC 端发送失败图标 hover 效果：放大并切换为重发箭头；H5 无 hover，保持默认 bang */
.message-bubble-wrapper__status-icon--failed-hover {
  position: absolute;
  left: 0;
  top: 50%;
  opacity: 0;
  transform: translateY(-50%) scale(1);
}

@media (hover: hover) {
  .message-bubble-wrapper__status-item--failed:hover
    .message-bubble-wrapper__status-icon:not(.message-bubble-wrapper__status-icon--failed-hover) {
    opacity: 0;
  }
  .message-bubble-wrapper__status-item--failed:hover .message-bubble-wrapper__status-icon--failed-hover {
    opacity: 1;
    transform: translateY(-50%) scale(1.2);
  }
}

.message-bubble-wrapper__status--vertical .message-bubble-wrapper__status-item {
  flex-direction: column;
}

.message-bubble-wrapper__status-text {
  font-size: var(--uikit-font-size-10);
  color: var(--uikit-text-secondary);
  line-height: 1;
  margin-left: 4px;
  white-space: nowrap;
}

.message-bubble-wrapper__status--vertical .message-bubble-wrapper__status-text {
  margin-left: 0;
  margin-top: 2px;
}

/* 群已读人数标注（设计师稿：状态徽章色空心圆/胶囊，1 位圆、2~3 位胶囊，999+ 封顶） */
.message-bubble-wrapper__group-read {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid var(--uikit-msg-status-badge-color, #47ADEB);
  background: transparent;
  color: var(--uikit-msg-status-badge-color, #47ADEB);
  font-size: var(--uikit-font-size-7);
  font-weight: var(--uikit-font-weight-medium);
  line-height: 1;
  padding: 0 3px;
  margin-top: 2px;
  cursor: pointer;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

@media (hover: hover) {
  .message-bubble-wrapper__group-read:hover {
    opacity: 0.8;
  }
}

/* 全部已读：灰色打勾圆（无边框，icon 自带圆形） */
.message-bubble-wrapper__group-read--all {
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--uikit-text-tertiary, #919BA1);
}

/* 无人已读：主题色空心圆 icon（无边框，icon 自带圆形） */
.message-bubble-wrapper__group-read--zero {
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
}

.message-bubble-wrapper__message-row .message-bubble-wrapper__group-read {
  margin-top: 0;
}

/* 消息状态图标切换过渡（发送中 → 已读等状态图标交替时的淡入淡出） */
.uikit-status-icon-enter-active,
.uikit-status-icon-leave-active {
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-status-icon-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.uikit-status-icon-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* 通知类型消息：居中 chip（气泡底，对齐设计稿 SystemMessage） */
.message-bubble-wrapper__notice {
  align-self: center;
  max-width: 70%;
  margin: 0 auto;
  padding: 2px 8px;
  background-color: var(--uikit-message-chip-bg, var(--uikit-bubble-bg-other, #E4E6E7));
  border-radius: var(--uikit-components-radius, 8px);
  color: var(--uikit-text-secondary, #5E686E);
  font-size: var(--uikit-font-size-11);
  line-height: 16px;
  text-align: center;
  /* 公告等长内容通知：保留换行并允许长单词折行 */
  white-space: pre-wrap;
  word-break: break-word;
}

/* 已撤回消息：居中灰色提示 */
.message-bubble-wrapper--recalled {
  justify-content: center;
}

.message-bubble-wrapper__recalled {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}

.message-bubble-wrapper__recalled-text {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

/* 被引用/定位后的高亮：整行底色横带。
 * 横带用中性灰 --uikit-bg-hover（随明/暗主题），不占用主题色；圆角跟随
 * --uikit-components-radius（主题设直角即为直角）。
 * 三阶段：脉冲（2 次）→ 静态保持 → 平滑淡出；
 * 总时长 2.8s 与 message-list 高亮计时器（3000ms）对齐，动画结束后类移除无视觉突变。 */
.message-bubble-wrapper--highlight {
  /* 高亮横带内边距：负 margin 抵消，避免高亮时布局抖动 */
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: var(--uikit-components-radius, 8px);
  animation: message-row-flash 2.8s ease-in-out forwards;
}

/* 头像右键菜单 */
.avatar-context-menu {
  min-width: 120px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.avatar-context-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--uikit-components-radius);
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .avatar-context-menu__item:hover {
    background-color: var(--uikit-bg-hover);
  }
}

/* 置顶角标 */
.message-bubble-wrapper__pin-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  margin-bottom: 2px;
  padding: 1px 6px;
  font-size: var(--uikit-font-size-10);
  color: var(--uikit-primary-color);
  background-color: rgba(var(--uikit-primary-rgb), 0.1);
  border-radius: var(--uikit-components-radius, 8px);
  user-select: none;
}

.message-bubble-wrapper--self .message-bubble-wrapper__pin-badge {
  align-self: flex-end;
}

/* 整行底色横带：2 次脉冲 → 保持 → 淡出（中性灰，随明/暗主题） */
@keyframes message-row-flash {
  0% {
    background-color: transparent;
  }
  8%,
  30% {
    background-color: var(--uikit-bg-hover);
  }
  18% {
    background-color: transparent;
  }
  45%,
  70% {
    background-color: var(--uikit-bg-hover);
  }
  100% {
    background-color: transparent;
  }
}
</style>
