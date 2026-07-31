<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import QuoteCard from '../quote/quote-card.vue'
import type { UiMessage } from '../../../sdk/types'
import type { ChatConfig, MessageActionEvent, MessageLayout, MessageStatusConfig, TimeDisplayStrategy } from '../types'
import { CONVERSATION_TYPE, MESSAGE_STATUS } from '../../../constants'
import type { MessageStatusValue } from '../../../constants'
import { useGroupStore } from '../../../store/group'
import { useLocale } from '../../../locale'
import { useQuote } from '../../../composables/use-quote'
import { useUserInfo } from '../../../composables/use-user-info'
import { usePresence } from '../../../composables/use-presence'
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
  (e: 'toggle-translation', message: UiMessage): void
  (e: 'resend', message: UiMessage): void
  (e: 'mention-click', userId: string): void
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

const { displayName, avatarUrl } = useUserInfo(() => props.message.from)
const { get: getPresence } = usePresence()

/** 发送者在线状态：己方消息不展示（自己的在线状态对自己没有信息量） */
const senderPresence = computed<PresenceDisplayStatus | undefined>(() => {
  if (props.message.isSelf)
    return undefined
  return getPresence(props.message.from).value?.status as PresenceDisplayStatus | undefined
})

/** 是否为通知类型消息 */
const isNotice = computed(() => (props.message.type as string) === 'notice')

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
const isSelfConversation = computed(() => layout.value === 'conversation' && props.message.isSelf)

/** 头像尺寸 */
const avatarSize = 36

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

/** 是否显示发送状态（仅自己的消息；群聊已读回执激活时用圆圈替代） */
const showStatus = computed(() => props.message.isSelf && !isGroupReadReceiptActive.value)

/** 消息状态 */
const messageStatus = computed(() => props.message.status)

/** 消息状态展示配置 */
const statusConfig = computed<MessageStatusConfig>(() => props.config?.messageStatus || {})

/** 默认状态图标映射 */
const defaultStatusIconMap: Record<MessageStatusValue, string> = {
  [MESSAGE_STATUS.SENDING]: 'actions/loading_circle',
  [MESSAGE_STATUS.SENT]: 'actions/check',
  [MESSAGE_STATUS.DELIVERED]: 'chat/doneAll',
  [MESSAGE_STATUS.READ]: 'chat/doneAll',
  [MESSAGE_STATUS.FAILED]: 'status/error',
}

/** 当前状态图标 */
const statusIcon = computed(() => {
  const cfg = statusConfig.value.iconMap
  return cfg?.[messageStatus.value as MessageStatusValue] ?? defaultStatusIconMap[messageStatus.value as MessageStatusValue]
})

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
  if (statusPosition.value === 'inline') {
    checkMultiLine()
    if (bodyRef.value && typeof ResizeObserver !== 'undefined') {
      bodyResizeObserver = new ResizeObserver(checkMultiLine)
      bodyResizeObserver.observe(bodyRef.value)
    }
  }
})

onBeforeUnmount(() => {
  bodyResizeObserver?.disconnect()
})

/** 点击状态：失败时触发重发 */
function onStatusClick() {
  if (messageStatus.value === MESSAGE_STATUS.FAILED) {
    emit('resend', props.message)
  }
}

/** 群聊已读回执是否激活（用圆圈替代普通状态） */
const isGroupReadReceiptActive = computed(() =>
  props.message.isSelf
  && props.message.conversationType === CONVERSATION_TYPE.GROUPCHAT
  && (props.message.requireGroupAck || (props.message.groupReadCount ?? 0) > 0),
)

/** 是否显示群已读人数标注 */
const showGroupReadCount = computed(() => isGroupReadReceiptActive.value)

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
    msgType: String(q.msgType || 'text'),
  } as { msgID: string, msgPreview: string, msgSender: string, msgType: 'text' | 'image' | 'video' | 'file' | 'voice' | 'custom' | 'location' | 'cmd' }
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
      <div class="message-bubble-wrapper__notice">
        {{ (message.body as any).content || (message as any).content || '' }}
      </div>
    </template>

    <!-- 已撤回消息：居中灰色提示，不显示头像/昵称/气泡 -->
    <template v-else-if="isRecalled">
      <div class="message-bubble-wrapper__recalled">
        <span class="message-bubble-wrapper__recalled-text">{{ recalledText }}</span>
        <!-- 文本消息重新编辑按钮 -->
        <MessageRenderer
          v-if="message.type === 'text' && message.isSelf && message.originalMsg"
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
        <div v-if="showAvatar" class="message-bubble-wrapper__avatar">
          <slot name="avatar" :message="message">
            <Avatar :name="displayName" :src="avatarUrl" :size="avatarSize" :presence="senderPresence" />
          </slot>
        </div>

        <!-- 内容区域 -->
        <div class="message-bubble-wrapper__content">
          <!-- 昵称 -->
          <div v-if="!message.isSelf" class="message-bubble-wrapper__nickname">
            <slot name="nickname" :message="message">
              {{ displayName }}
            </slot>
          </div>

          <!-- ===== 状态在气泡下方（默认/历史行为） ===== -->
          <template v-if="statusPosition === 'below'">
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
                  @toggle-translation="emit('toggle-translation', $event)"
                  @view-combine="onViewCombine"
                  @mention-click="emit('mention-click', $event)"
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
              :class="{ 'message-bubble-wrapper__group-read--all': isGroupReadAll }"
              :title="`${groupReadCount}人已读${groupUnreadCount > 0 ? `/${groupMemberCount}人` : ''}`"
              @click.stop="onGroupReadClick"
            >
              <Icon v-if="isGroupReadAll" name="actions/check" :size="10" />
              <template v-else>{{ groupReadCount }}</template>
            </button>
          </template>

          <!-- ===== 状态与气泡同一行 ===== -->
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
                  @toggle-translation="emit('toggle-translation', $event)"
                  @view-combine="onViewCombine"
                  @mention-click="emit('mention-click', $event)"
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
              </MessageInteractive>
              <!-- 引用卡片（气泡下方） -->
              <QuoteCard
                v-if="quoteData"
                :quote="quoteData"
                :align-right="isSelfConversation"
                @click="onQuoteClick"
              />
            </div>

            <!-- 状态列（状态 + 群已读） -->
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
                :class="{ 'message-bubble-wrapper__group-read--all': isGroupReadAll }"
                :title="`${groupReadCount}人已读${groupUnreadCount > 0 ? `/${groupMemberCount}人` : ''}`"
                @click.stop="onGroupReadClick"
              >
                <Icon v-if="isGroupReadAll" name="actions/check" :size="10" />
                <template v-else>{{ groupReadCount }}</template>
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
  </div>
</template>

<style scoped>
.message-bubble-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
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
  gap: 8px;
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
  font-size: 12px;
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
  font-size: 11px;
  color: var(--uikit-text-secondary);
  margin-top: 2px;
  padding-left: 2px;
}

/* hover 显示时间 */
.message-bubble-wrapper--hover-time .message-bubble-wrapper__time {
  opacity: 0;
  transition: opacity 0.2s;
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
  color: var(--uikit-text-tertiary, #94a3b8);
  flex-shrink: 0;
  transition: color 0.15s;
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
  color: var(--uikit-danger-color, #e74c3c);
  cursor: pointer;
}

.message-bubble-wrapper__status-icon {
  display: inline-flex;
  color: inherit;
}

.message-bubble-wrapper__status-icon--loading {
  animation: message-status-loading 0.8s linear infinite;
}

.message-bubble-wrapper__status-icon--read {
  color: var(--uikit-primary-color);
}

.message-bubble-wrapper__status--vertical .message-bubble-wrapper__status-item {
  flex-direction: column;
}

.message-bubble-wrapper__status-text {
  font-size: 11px;
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
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--uikit-text-secondary);
  background: transparent;
  color: var(--uikit-text-secondary);
  font-size: 10px;
  line-height: 1;
  padding: 0;
  margin-top: 2px;
  padding-left: 2px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
  flex-shrink: 0;
}

.message-bubble-wrapper__group-read:hover {
  color: var(--uikit-primary-color);
  border-color: var(--uikit-primary-color);
}

.message-bubble-wrapper__group-read--all {
  border-color: var(--uikit-primary-color);
  color: var(--uikit-primary-color);
}

.message-bubble-wrapper__message-row .message-bubble-wrapper__group-read {
  margin-top: 0;
  padding-left: 0;
}

@keyframes message-status-loading {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 通知类型消息：居中灰色小字，无背景 */
.message-bubble-wrapper__notice {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  color: var(--uikit-text-secondary);
  font-size: 12px;
  text-align: center;
  width: 100%;
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
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

/* 被引用定位后的闪烁高亮：作用于气泡主体，避免影响头像/名称/状态 */
.message-bubble-wrapper--highlight .message-bubble-wrapper__body {
  animation: message-bubble-flash 1.2s ease-in-out;
  border-radius: 8px;
}

/* 置顶角标 */
.message-bubble-wrapper__pin-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  margin-bottom: 2px;
  padding: 1px 6px;
  font-size: 11px;
  color: var(--uikit-primary-color, #5f6df3);
  background-color: rgba(95, 109, 243, 0.1);
  border-radius: 8px;
  user-select: none;
}

.message-bubble-wrapper--self .message-bubble-wrapper__pin-badge {
  align-self: flex-end;
}

@keyframes message-bubble-flash {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
    background-color: transparent;
  }
  20% {
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.35);
    background-color: rgba(64, 158, 255, 0.12);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0);
    background-color: rgba(64, 158, 255, 0.06);
  }
  80% {
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
    background-color: rgba(64, 158, 255, 0.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
    background-color: transparent;
  }
}
</style>
