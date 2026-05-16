<script setup lang="ts">
import { computed, ref } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import MessageRenderer from './message-renderer.vue'
import MessageInteractive from './message-interactive.vue'
import QuoteCard from '../quote/quote-card.vue'
import CombineMessageModal from './combine-message-modal.vue'
import type { Message } from '../../../store/message'
import type { ChatConfig, MessageLayout, TimeDisplayStrategy, MessageActionEvent } from '../types'
import { MESSAGE_STATUS, CONVERSATION_TYPE } from '../../../constants'
import { useGroupStore } from '../../../store/group'
import { useLocale } from '../../../locale'
import { useQuote } from '../../../composables/use-quote'


export interface MessageBubbleWrapperProps {
  message: Message
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
  (e: 'reedit', message: Message): void
  (e: 'toggle-translation', message: Message): void
  (e: 'resend', message: Message): void
  (e: 'mention-click', userId: string): void
}

/** 弹窗中嵌套合并消息的层级栈 */
interface ModalState {
  show: boolean
  message: Message | null
}

const modalStack = ref<ModalState[]>([])

/** 当前最上层弹窗 */
const topModal = computed(() => {
  const len = modalStack.value.length
  return len > 0 ? modalStack.value[len - 1] : null
})

/** 打开合并消息弹窗 */
function openCombineModal(message: Message) {
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
function onViewCombine(message: Message) {
  openCombineModal(message)
}

const props = defineProps<MessageBubbleWrapperProps>()
const emit = defineEmits<MessageBubbleWrapperEmits>()

const { t } = useLocale()

/** 是否为已撤回消息 */
const isRecalled = computed(() => props.message.recalled)

/** 撤回提示文案 */
const recalledText = computed(() => {
  const from = props.message.from || ''
  return `${from} ${t('message.recalled') ?? '撤回了一条消息'}`
})

const groupStore = useGroupStore()
const { highlightedMessageId, requestLocate } = useQuote()

/** 布局模式 */
const layout = computed<MessageLayout>(() => props.config?.layout ?? 'conversation')

/** 是否显示头像 */
const showAvatar = computed(() => props.config?.showAvatar ?? true)

/** 是否显示时间 */
const showTime = computed<TimeDisplayStrategy>(() => props.config?.showTime ?? 'always')

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
  if (showTime.value === false) return false
  return true // 'always' | 'hover' | true 都默认显示，hover 样式通过 CSS 控制
})

/** 是否显示发送状态（仅自己的消息） */
const showStatus = computed(() => props.message.isSelf)

/** 消息状态 */
const messageStatus = computed(() => props.message.status)

/** 是否显示群已读人数标注 */
const showGroupReadCount = computed(() =>
  props.message.isSelf
  && props.message.requireGroupAck
  && props.message.chatType === CONVERSATION_TYPE.GROUPCHAT
)

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
  groupMemberCount.value > 0 ? groupMemberCount.value - groupReadCount.value : 0
)

/** 群已读标注点击 */
function onGroupReadClick() {
  if (props.message.chatType === CONVERSATION_TYPE.GROUPCHAT) {
    emit('group-read-click', props.message.id, props.message.to || props.message.conversationId)
  }
}

/** 提取引用数据：仅在 ext.msgQuote 存在且具有 msgPreview 时返回 */
const quoteData = computed(() => {
  const ext = (props.message as unknown as { ext?: Record<string, any> }).ext
  const q = ext?.msgQuote
  if (!q || typeof q !== 'object') return null
  if (!q.msgPreview) return null
  return {
    msgID: String(q.msgID || ''),
    msgPreview: String(q.msgPreview || ''),
    msgSender: String(q.msgSender || ''),
    msgType: String(q.msgType || 'txt'),
  } as { msgID: string; msgPreview: string; msgSender: string; msgType: 'txt' | 'img' | 'video' | 'file' | 'audio' | 'custom' | 'loc' | 'cmd' }
})

/** 点击引用卡片：触发定位/闪烁，列表端 watch locateRequest 处理 */
function onQuoteClick() {
  if (!quoteData.value?.msgID) return
  requestLocate(quoteData.value.msgID)
}

/** 当前气泡是否需要闪烁高亮（被其他引用卡片定位到） */
const isHighlighted = computed(() => {
  const target = highlightedMessageId.value
  if (!target) return false
  return target === props.message.mid || target === props.message.id
})
</script>

<template>
  <div
    class="message-bubble-wrapper"
    :data-msg-id="props.message.mid || props.message.id"
    :class="{
      'message-bubble-wrapper--self': isSelfConversation,
      'message-bubble-wrapper--left': layout === 'left',
      'message-bubble-wrapper--hover-time': showTime === 'hover',
      'message-bubble-wrapper--selected': props.isSelected,
      'message-bubble-wrapper--recalled': isRecalled,
      'message-bubble-wrapper--highlight': isHighlighted,
    }"
    @click="props.isMultiSelectMode && emit('toggle-select', props.message.id)"
  >
    <!-- 已撤回消息：居中灰色提示，不显示头像/昵称/气泡 -->
    <template v-if="isRecalled">
      <div class="message-bubble-wrapper__recalled">
        <span class="message-bubble-wrapper__recalled-text">{{ recalledText }}</span>
        <!-- 文本消息重新编辑按钮 -->
        <MessageRenderer
          v-if="message.type === 'txt' && message.isSelf && message.originalMsg"
          :message="message"
          @reedit="emit('reedit', $event)"
        />
      </div>
    </template>

    <template v-else>
      <!-- 多选 Checkbox：微信风格，所有消息统一放在最左侧（独立于内层 row-reverse 之外） -->
      <div v-if="props.isMultiSelectMode" class="message-bubble-wrapper__checkbox">
        <div
          class="message-bubble-wrapper__check-icon"
          :class="{ 'message-bubble-wrapper__check-icon--checked': props.isSelected }"
        >
          <span v-if="props.isSelected">&#10003;</span>
        </div>
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
          <Avatar :name="message.from" :size="avatarSize" />
        </slot>
      </div>

      <!-- 内容区域 -->
      <div class="message-bubble-wrapper__content">
        <!-- 昵称 -->
        <div v-if="!message.isSelf" class="message-bubble-wrapper__nickname">
          <slot name="nickname" :message="message">
            {{ message.from }}
          </slot>
        </div>

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
        <div v-if="showStatus" class="message-bubble-wrapper__status">
          <!-- 发送中 -->
          <span v-if="messageStatus === MESSAGE_STATUS.SENDING" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--loading">&#8226;</span>
          <!-- 已发送 -->
          <span v-else-if="messageStatus === MESSAGE_STATUS.SENT" class="message-bubble-wrapper__status-icon" title="已发送">&#10003;</span>
          <!-- 已送达 -->
          <span v-else-if="messageStatus === MESSAGE_STATUS.DELIVERED" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--delivered" title="已送达">&#10003;&#10003;</span>
          <!-- 已读 -->
          <span v-else-if="messageStatus === MESSAGE_STATUS.READ" class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--read" title="已读">&#10003;&#10003;</span>
          <!-- 发送失败 -->
          <span
            v-else-if="messageStatus === MESSAGE_STATUS.FAILED"
            class="message-bubble-wrapper__status-icon message-bubble-wrapper__status-icon--failed"
            title="点击重发"
            @click.stop="emit('resend', message)"
          >&#33;</span>
        </div>

        <!-- 群已读人数标注 -->
        <span
          v-if="showGroupReadCount"
          class="message-bubble-wrapper__group-read"
          @click.stop="onGroupReadClick"
        >
          {{ groupReadCount }}人已读<span v-if="groupUnreadCount > 0">/{{ groupMemberCount }}人</span>
        </span>

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
      :key="modal.message?.id || idx"
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--uikit-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: all 0.15s;
}

.message-bubble-wrapper__check-icon--checked {
  background-color: var(--uikit-primary-color);
  border-color: var(--uikit-primary-color);
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

.message-bubble-wrapper__status-icon {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  line-height: 1;
}

.message-bubble-wrapper__status-icon--loading {
  animation: message-status-loading 1s infinite;
  color: var(--uikit-text-secondary);
}

.message-bubble-wrapper__status-icon--delivered {
  letter-spacing: -2px;
  font-size: 11px;
}

.message-bubble-wrapper__status-icon--read {
  color: var(--uikit-primary-color);
  letter-spacing: -2px;
  font-size: 11px;
}

.message-bubble-wrapper__status-icon--failed {
  color: #e74c3c;
  font-weight: bold;
  cursor: pointer;
}

/* 群已读人数标注 */
.message-bubble-wrapper__group-read {
  font-size: 11px;
  color: var(--uikit-text-secondary);
  margin-top: 2px;
  padding-left: 2px;
  cursor: pointer;
  transition: color 0.15s;
}

.message-bubble-wrapper__group-read:hover {
  color: var(--uikit-primary-color);
}

@keyframes message-status-loading {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
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
  0%   { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0); background-color: transparent; }
  20%  { box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.35); background-color: rgba(64, 158, 255, 0.12); }
  50%  { box-shadow: 0 0 0 4px rgba(64, 158, 255, 0); background-color: rgba(64, 158, 255, 0.06); }
  80%  { box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2); background-color: rgba(64, 158, 255, 0.10); }
  100% { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0); background-color: transparent; }
}
</style>
