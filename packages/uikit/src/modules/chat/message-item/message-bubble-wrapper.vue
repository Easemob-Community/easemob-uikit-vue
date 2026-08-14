<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import Popup from '../../../components/popup/popup.vue'
import QuoteCard from '../quote/quote-card.vue'
import type { LocationMessageBody, UiMessage } from '../../../sdk/types'
import type { ChatConfig, MessageActionEvent, MessageLayout, MessageStatusConfig, MessageStatusStyle, TimeDisplayStrategy } from '../types'
import { CONVERSATION_TYPE, INJECTION_KEY, MESSAGE_STATUS, MESSAGE_TYPE } from '../../../constants'
import type { MessageStatusValue } from '../../../constants'
import { useGroupStore } from '../../../store/group'
import { useClientStore } from '../../../store/client'
import { useLocale } from '../../../locale'
import { type MsgQuotePayload, useQuote } from '../../../composables/use-quote'
import { useUserInfo } from '../../../composables/use-user-info'
import { usePresence } from '../../../composables/use-presence'
import { normalizeUserId } from '../../../sdk/adapter/message-adapter'
import type { PresenceDisplayStatus } from '../../../components/avatar/avatar.vue'
import CombineMessageModal from './combine-message-modal.vue'
import MessageInteractive from './message-interactive.vue'
import MessageRenderer from './message-renderer.vue'

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
  (e: 'avatar-view-profile', userId: string): void
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

/** 发送者在线状态：己方消息不展示（自己的在线状态对自己没有信息量） */
const senderPresence = computed<PresenceDisplayStatus | undefined>(() => {
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

/** 是否显示头像 */
const showAvatar = computed(() => props.config?.showAvatar ?? true)

/** 是否显示时间 */
const showTime = computed<TimeDisplayStrategy>(() => props.config?.showTime ?? false)

/** 是否为对话模式且是己方消息 */
const isSelfConversation = computed(() => layout.value === 'conversation' && isSelf.value)

/** 头像尺寸 */
const avatarSize = computed(() => props.config?.avatarSize ?? 36)

/** 气泡形状：config.messageList.bubbleShape 优先于主题全局 bubbleShape，气泡组件 inject 消费 */
const bubbleShape = computed(() => props.config?.bubbleShape)
provide(INJECTION_KEY.BUBBLE_SHAPE, bubbleShape)

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

/** 群聊已读回执是否激活（用圆圈替代普通状态）。发送失败消息优先展示失败重发图标，不走已读回执。 */
const isGroupReadReceiptActive = computed(() => {
  if (!isSelf.value || props.message.conversationType !== CONVERSATION_TYPE.GROUPCHAT)
    return false
  // 发送失败时强制展示经典失败状态，避免已读圆圈为空导致用户看不到发送结果
  if (messageStatus.value === MESSAGE_STATUS.FAILED)
    return false
  // 消息本身已请求回执或已有回执数据，直接激活
  if (props.message.requireGroupAck || (props.message.groupReadCount ?? 0) > 0)
    return true
  // 配置开启时，群聊己方消息默认激活（兼容历史消息与未收到回执的新消息）
  return props.groupReadReceiptConfig?.enabled === true
})

/** 是否显示群已读人数标注 */
const showGroupReadCount = computed(() => isGroupReadReceiptActive.value)

/** 是否显示发送状态（仅自己的消息；群聊已读回执激活时用圆圈替代） */
const showStatus = computed(() => isSelf.value && !isGroupReadReceiptActive.value)

/** 消息状态 */
const messageStatus = computed(() => props.message.status)

/** 消息状态展示配置 */
const statusConfig = computed<MessageStatusConfig>(() => props.config?.messageStatus || {})

/** 经典状态图标映射（默认） */
const classicStatusIconMap: Record<MessageStatusValue, string> = {
  // 发送中：小尺寸（14px）使用小弧 loading 图标，避免大弧在小尺寸下拥挤
  [MESSAGE_STATUS.SENDING]: 'message-status/loading',
  [MESSAGE_STATUS.SENT]: 'message-status/empty',
  [MESSAGE_STATUS.DELIVERED]: 'message-status/empty',
  [MESSAGE_STATUS.READ]: 'message-status/checked',
  // 发送失败：圆圈内感叹号提示可点击重发
  [MESSAGE_STATUS.FAILED]: 'message-status/bang',
}

/** 数字胶囊状态图标映射（线性/描边版）
 * 语义：未读=空心圆，已读=空心圆+对勾；发送中/失败保持经典图标
 */
const capsuleStatusIconMap: Record<MessageStatusValue, string> = {
  [MESSAGE_STATUS.SENDING]: 'message-status/loading',
  [MESSAGE_STATUS.SENT]: 'message-status/empty',
  [MESSAGE_STATUS.DELIVERED]: 'message-status/empty',
  [MESSAGE_STATUS.READ]: 'message-status/checked',
  [MESSAGE_STATUS.FAILED]: 'message-status/bang',
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
const failedHoverIcon = 'message-status/retry'

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

/** 状态相对气泡位置 */
const statusPosition = computed(() => statusConfig.value.position ?? 'below')

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
  if (!body || !statusColumn)
    return
  // 气泡明显高于状态列时视为多行，此时状态列沉底对齐
  isBodyMultiLine.value = body.clientHeight > statusColumn.clientHeight + 8
}

let bodyResizeObserver: ResizeObserver | null = null

onMounted(() => {
  // 状态列与气泡同行的两种场景：配置 inline，或群已读回执激活（此时无论
  // statusPosition 如何都走 message-row 分支）。二者都需要多行检测来沉底。
  if (statusPosition.value === 'inline' || showGroupReadCount.value) {
    checkMultiLine()
    if (bodyRef.value && typeof ResizeObserver !== 'undefined') {
      bodyResizeObserver = new ResizeObserver(checkMultiLine)
      bodyResizeObserver.observe(bodyRef.value)
    }
  }
})

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
  emit('avatar-view-profile', props.message.from)
}

/** @ 该用户 */
function onMentionFromAvatar() {
  closeAvatarMenu()
  emit('avatar-mention', { userId: props.message.from, name: displayName.value || props.message.from })
}

onBeforeUnmount(() => {
  bodyResizeObserver?.disconnect()
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
        <Icon
          :name="props.isSelected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
          :size="18"
          class="message-bubble-wrapper__check-icon"
          :class="{ 'message-bubble-wrapper__check-icon--checked': props.isSelected }"
        />
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
        <div v-if="showAvatar" class="message-bubble-wrapper__avatar" @contextmenu.stop="onAvatarContextMenu">
          <slot name="avatar" :message="message">
            <Avatar :name="displayName" :src="avatarUrl" :size="avatarSize" :presence="senderPresence" />
          </slot>
        </div>

        <!-- 内容区域 -->
        <div class="message-bubble-wrapper__content">
          <!-- 昵称 -->
          <div v-if="!isSelf" class="message-bubble-wrapper__nickname">
            <slot name="nickname" :message="message">
              {{ displayName }}
            </slot>
          </div>

          <!-- ===== 状态在气泡下方（默认/历史行为） ===== -->
          <template v-if="statusPosition === 'below' && !showGroupReadCount">
            <!-- 消息渲染器 -->
            <div class="message-bubble-wrapper__body">
              <!-- 置顶角标 -->
              <div
                v-if="message.pinned"
                class="message-bubble-wrapper__pin-badge"
                :title="t('message.action.pin')"
              >
                <Icon name="chat/pin" :size="12" />
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
                <template #message-action-extra="slotProps">
                  <slot name="message-action-extra" v-bind="slotProps" />
                </template>
              </MessageInteractive>
              <!-- 引用卡片（气泡下方） -->
              <QuoteCard
                v-if="quoteData"
                :quote="quoteData"
                :align-right="isSelfConversation"
                @click="onQuoteClick"
              />
            </div>

            <!-- 消息状态指示器（仅己方消息） -->
            <div
              v-if="showStatus"
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
                        'message-bubble-wrapper__status-icon--delivered': messageStatus === MESSAGE_STATUS.DELIVERED,
                        'message-bubble-wrapper__status-icon--read': messageStatus === MESSAGE_STATUS.READ,
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

          <!-- ===== 状态与气泡同一行（群已读回执默认与气泡同行） ===== -->
          <div
            v-else
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
                <Icon name="chat/pin" :size="12" />
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
                <template #message-action-extra="slotProps">
                  <slot name="message-action-extra" v-bind="slotProps" />
                </template>
              </MessageInteractive>
              <!-- 引用卡片（气泡下方） -->
              <QuoteCard
                v-if="quoteData"
                :quote="quoteData"
                :align-right="isSelfConversation"
                @click="onQuoteClick"
              />
            </div>

            <!-- 状态列（状态 + 群已读，默认位于己方气泡左侧） -->
            <div
              v-if="showStatus || showGroupReadCount"
              ref="statusColumnRef"
              class="message-bubble-wrapper__status-column"
              :class="{
                'message-bubble-wrapper__status-column--vertical': statusDirection === 'vertical',
              }"
            >
              <div
                v-if="showStatus"
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
                        'message-bubble-wrapper__status-icon--loading': messageStatus === MESSAGE_STATUS.SENDING,
                        'message-bubble-wrapper__status-icon--delivered': messageStatus === MESSAGE_STATUS.DELIVERED,
                        'message-bubble-wrapper__status-icon--read': messageStatus === MESSAGE_STATUS.READ,
                      }"
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
                <Icon v-if="isGroupReadAll" name="message-status/checked" :size="14" />
                <template v-else-if="groupReadCount > 0">{{ groupReadCount }}</template>
              </button>
            </div>
          </div>

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
          <Icon name="people/person_single" :size="16" />
          <span>{{ t('message.avatar.viewProfile') }}</span>
        </div>
        <div v-if="isGroupChat" class="avatar-context-menu__item" @click="onMentionFromAvatar">
          <Icon name="empty/mentions" :size="16" />
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
  margin-top: 2px;
}

.message-bubble-wrapper__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 70%;
  min-width: 0;
}

.message-bubble-wrapper__nickname {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  margin-bottom: 2px;
  padding-left: 2px;
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
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  margin-top: 2px;
  padding-left: 2px;
}

/* hover 显示时间 */
.message-bubble-wrapper--hover-time .message-bubble-wrapper__time {
  opacity: 0;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-bubble-wrapper--hover-time:hover .message-bubble-wrapper__time {
  opacity: 1;
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

.message-bubble-wrapper__check-icon {
  color: var(--uikit-text-tertiary);
  flex-shrink: 0;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-bubble-wrapper__check-icon--checked {
  color: var(--uikit-primary-color);
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

.message-bubble-wrapper__status-icon--read {
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
  .message-bubble-wrapper__status-item--failed:hover .message-bubble-wrapper__status-icon:not(.message-bubble-wrapper__status-icon--failed-hover) {
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
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  line-height: 1;
  margin-left: 4px;
  white-space: nowrap;
}

.message-bubble-wrapper__status--vertical .message-bubble-wrapper__status-text {
  margin-left: 0;
  margin-top: 2px;
}

/* 群已读人数标注（企业微信风格圆圈） */
.message-bubble-wrapper__group-read {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--uikit-text-secondary);
  background: transparent;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-8);
  line-height: 1;
  padding: 0;
  margin-top: 2px;
  padding-left: 2px;
  cursor: pointer;
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    border-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

@media (hover: hover) {
.message-bubble-wrapper__group-read:hover {
  color: var(--uikit-primary-color);
  border-color: var(--uikit-primary-color);
}
}

.message-bubble-wrapper__group-read--all {
  border: none;
  background: transparent;
  color: var(--uikit-primary-color);
}

.message-bubble-wrapper__group-read--zero {
  border-color: var(--uikit-primary-color);
}

.message-bubble-wrapper__message-row .message-bubble-wrapper__group-read {
  margin-top: 0;
  padding-left: 0;
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

/* 通知类型消息：居中灰色小字，无背景 */
.message-bubble-wrapper__notice {
  align-self: center;
  max-width: 70%;
  margin: 0 auto;
  padding: 8px 12px;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-12);
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
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

/* 被引用/定位后的高亮：作用于气泡主体，避免影响头像/名称/状态。
 * 三阶段：主题色脉冲（边框+背景+发光）→ 静态保持 → 平滑淡出；
 * 总时长 2.4s 与 message-list 高亮计时器（2500ms）对齐，动画结束后类移除无视觉突变。 */
.message-bubble-wrapper--highlight .message-bubble-wrapper__body {
  border-radius: var(--uikit-components-radius, 8px);
  animation: message-bubble-flash 2.4s ease-in-out forwards;
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
  font-size: var(--uikit-font-size-13);
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
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-primary-color);
  background-color: rgba(var(--uikit-primary-rgb), 0.1);
  border-radius: var(--uikit-components-radius, 8px);
  user-select: none;
}

.message-bubble-wrapper--self .message-bubble-wrapper__pin-badge {
  align-self: flex-end;
}

@keyframes message-bubble-flash {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--uikit-primary-rgb), 0);
    background-color: transparent;
  }
  /* 三次主题色脉冲峰值（2px 边框 + 发光 + 背景着染） */
  8%, 30%, 50% {
    box-shadow: 0 0 0 2px var(--uikit-primary-color), 0 0 16px rgba(var(--uikit-primary-rgb), 0.5);
    background-color: rgba(var(--uikit-primary-rgb), 0.14);
  }
  /* 脉冲间回落，保留弱边框保持识别 */
  20%, 42% {
    box-shadow: 0 0 0 2px rgba(var(--uikit-primary-rgb), 0.55), 0 0 10px rgba(var(--uikit-primary-rgb), 0.25);
    background-color: rgba(var(--uikit-primary-rgb), 0.08);
  }
  /* 静态保持：醒目但稳定的高亮态 */
  62%, 70%, 88% {
    box-shadow: 0 0 0 2px rgba(var(--uikit-primary-rgb), 0.6), 0 0 10px rgba(var(--uikit-primary-rgb), 0.3);
    background-color: rgba(var(--uikit-primary-rgb), 0.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--uikit-primary-rgb), 0);
    background-color: transparent;
  }
}
</style>
