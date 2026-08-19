<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLongPress } from '@easemob/uikit-core'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmBadge as Badge } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmPopup as Popup } from '@easemob/uikit-core'
import { EmActionSheet as ActionSheet } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '@easemob/uikit-core'
import { usePresence, useViewport } from '@easemob/uikit-core'
import { useUserInfo } from '../../composables/use-user-info'
import { useUIKit } from '../../composables/use-uikit'
import type { UiConversation as Conversation } from '@easemob/uikit-core'
import type { PresenceDisplayStatus } from '@easemob/uikit-core'
import type { ConversationAction } from './types'

export interface ConversationItemProps {
  conversation: Conversation
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
  customActions?: ConversationAction[]
  /** 时间格式化函数 */
  timeFormatter?: (timestamp: number) => string
  /** 消息摘要格式化函数 */
  messageFormatter?: (msg: string, type?: string) => string
  /** 群聊是否显示发送者名称 */
  showSenderName?: boolean
  /** 未读数显示模式 */
  unreadMode?: 'count' | 'dot'
  /** 是否有人@我 */
  hasAtMe?: boolean
  /** 对方是否正在输入（仅单聊） */
  isTyping?: boolean
}

const props = withDefaults(defineProps<ConversationItemProps>(), {
  customActions: () => [],
  showSenderName: true,
  unreadMode: 'count',
  hasAtMe: false,
  isTyping: false,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'pin', id: string, isPinned: boolean): void
  (e: 'mute', id: string, muted: boolean): void
  (e: 'delete', id: string): void
  (e: 'read', id: string): void
  (e: 'custom-action', key: string, conversation: Conversation): void
}>()

const { t, locale } = useLocale()
const { features, theme } = useUIKit()
const { isMobile } = useViewport()

const isSingleChat = computed(() => props.conversation.type === CONVERSATION_TYPE.SINGLECHAT)
// SDK 的 conversationName 在 enableUserInfoSync 开启后已预填充用户资料。
// 仅在 SDK 名称为空或等于 userId 时才回退到 useUserInfo 单独获取，
// 头像缺失不影响——Avatar 组件会自动显示文字占位。
const sdkNameSufficient = computed(() =>
  !!props.conversation.name && props.conversation.name !== props.conversation.id,
)
const peerUserId = computed(() => {
  if (!isSingleChat.value)
    return undefined
  if (sdkNameSufficient.value)
    return undefined
  return props.conversation.id
})
const { userInfo, avatarUrl, contact } = useUserInfo(peerUserId)

/** 群聊最后一条消息发送者 userId，用于资料异步就绪后重新解析昵称 */
const lastMessageSenderUserId = computed(() => {
  if (!isSingleChat.value)
    return props.conversation.lastMessageFrom
  return undefined
})
const { displayName: lastMessageSenderDisplayName } = useUserInfo(lastMessageSenderUserId)

const { get: getPresence } = usePresence()

const peerPresence = computed<PresenceDisplayStatus | undefined>(() => {
  if (!isSingleChat.value || !peerUserId.value)
    return undefined
  return getPresence(peerUserId.value).value?.status as PresenceDisplayStatus | undefined
})

const conversationName = computed(() =>
  contact.value?.remark || userInfo.value?.nickname || props.conversation.name || props.conversation.id,
)
const conversationAvatar = computed(() => avatarUrl.value || props.conversation.avatar)

/** 实际是否展示 @我 提示（受全局 enableAtMe 开关控制） */
const effectiveHasAtMe = computed(() => props.hasAtMe && features.enableAtMe !== false)

/** 免打扰开启时铃铛摇摆动画（仅在状态由关闭变为开启时触发一次；全局动画关闭时跳过） */
const muteShaking = ref(false)
watch(() => props.conversation.isMuted, (muted, prev) => {
  if (muted && !prev && theme.animationEnabled) {
    muteShaking.value = false
    requestAnimationFrame(() => {
      muteShaking.value = true
    })
  }
})

function onMuteBadgeAnimEnd() {
  muteShaking.value = false
}

/** H5 长按 ActionSheet */
const showActionSheet = ref(false)
const preventClick = ref(false)

const longPress = useLongPress(() => {
  if (!isMobile.value)
    return
  preventClick.value = true
  showActionSheet.value = true
})

/** PC 右键菜单 - 使用 Popup 锚定模式 */
const showContextMenu = ref(false)
const contextMenuAnchor = ref<HTMLElement>()

function onContextMenu(e: MouseEvent) {
  if (isMobile.value) {
    return
  }
  e.preventDefault()

  // 如果已有菜单打开，先清理
  if (contextMenuAnchor.value) {
    document.body.removeChild(contextMenuAnchor.value)
    contextMenuAnchor.value = undefined
  }

  // 创建临时锚点元素在右键点击位置
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = `${e.clientX}px`
  el.style.top = `${e.clientY}px`
  el.style.width = '1px'
  el.style.height = '1px'
  document.body.appendChild(el)
  contextMenuAnchor.value = el
  showContextMenu.value = true
}

function onContextMenuClose() {
  showContextMenu.value = false
  if (contextMenuAnchor.value) {
    document.body.removeChild(contextMenuAnchor.value)
    contextMenuAnchor.value = undefined
  }
}

/** 点击选择 */
function onClick() {
  if (preventClick.value) {
    preventClick.value = false
    return
  }
  emit('select', props.conversation.id)
}

/** ===== 操作项 ===== */
interface MergedAction {
  key: string
  label: string
  icon?: string
  color?: string
  danger?: boolean
  position: 'mobile' | 'pc' | 'both'
  handler: () => void
}

const mergedActions = computed<MergedAction[]>(() => {
  const actions: MergedAction[] = []

  if (props.conversation.unreadCount) {
    actions.push({
      key: 'read',
      label: t('conversation.read'),
      icon: 'check/double',
      handler: () => emit('read', props.conversation.id),
      position: 'both',
    })
  }

  actions.push({
    key: 'pin',
    label: props.conversation.isPinned ? t('conversation.unpin') : t('conversation.pin'),
    icon: props.conversation.isPinned ? 'pin/slash' : 'pin',
    handler: () => emit('pin', props.conversation.id, !props.conversation.isPinned),
    position: 'both',
  })

  actions.push({
    key: 'mute',
    label: props.conversation.isMuted ? t('conversation.unmute') : t('conversation.mute'),
    icon: props.conversation.isMuted ? 'bell' : 'bell/slash',
    handler: () => emit('mute', props.conversation.id, !props.conversation.isMuted),
    position: 'both',
  })

  actions.push({
    key: 'delete',
    label: t('conversation.delete'),
    icon: 'trash',
    color: 'var(--uikit-danger-color)',
    danger: true,
    handler: () => emit('delete', props.conversation.id),
    position: 'both',
  })

  props.customActions?.forEach((custom) => {
    actions.push({
      key: custom.key,
      label: custom.label,
      icon: custom.icon,
      color: custom.color,
      danger: custom.danger,
      position: custom.position || 'both',
      handler: () => {
        if (custom.handler) {
          custom.handler(props.conversation)
        }
        else {
          emit('custom-action', custom.key, props.conversation)
        }
      },
    })
  })

  return actions
})

const actionSheetActions = computed(() => {
  return mergedActions.value
    .filter(a => a.position === 'mobile' || a.position === 'both')
    .map(a => ({ name: a.label, color: a.color, icon: a.icon }))
})

const contextMenuItems = computed(() => {
  return mergedActions.value
    .filter(a => a.position === 'pc' || a.position === 'both')
    .map(a => ({ label: a.label, action: a.key, danger: a.danger, icon: a.icon }))
})

function onActionSheetSelect(_item: { name: string, color?: string, icon?: string }, index: number) {
  const mobileActions = mergedActions.value.filter(
    a => a.position === 'mobile' || a.position === 'both',
  )
  mobileActions[index]?.handler()
}

function onContextMenuItemClick(actionKey: string) {
  onContextMenuClose()
  const action = mergedActions.value.find(a => a.key === actionKey)
  action?.handler()
}

/** ===== 显示内容计算 ===== */

/** 显示时间：优先取草稿时间，其次取最后消息时间 */
const displayTime = computed(() => {
  // 引入 locale 依赖，确保语言切换后会话列表时间即时刷新
  const currentLocale = locale.value
  const timestamp = props.conversation.draftTime || props.conversation.lastMessageTime
  if (!timestamp)
    return ''
  if (props.timeFormatter) {
    return props.timeFormatter(timestamp)
  }
  // 无 formatter 时 fallback 到简单格式
  return new Date(timestamp).toLocaleTimeString(currentLocale)
})

/** 是否显示草稿（受全局 enableDraft 开关控制） */
const displayDraft = computed(() => {
  return features.enableDraft !== false && !!props.conversation.draft
})

/** 显示消息内容：正在输入 > 草稿 > 最后消息，并用 messageFormatter 格式化 */
const displayMessage = computed(() => {
  if (props.isTyping) {
    return t('chat.typing', '对方正在输入...')
  }
  if (props.conversation.draft) {
    return props.conversation.draft
  }
  // 合并消息类型统一回显为 [聊天记录]
  if (false) {
    return t('message.combine', '[聊天记录]')
  }

  let text = props.conversation.lastMessageText || ''

  // 群聊会话列表：若当前摘要前缀是 userId 且资料已异步就绪，
  // 将前缀替换为备注/昵称，避免“点击会话后才显示昵称”的观感。
  if (
    !isSingleChat.value
    && props.conversation.lastMessageFrom
    && lastMessageSenderDisplayName.value
    && lastMessageSenderDisplayName.value !== props.conversation.lastMessageFrom
  ) {
    const prefix = `${props.conversation.lastMessageFrom}: `
    if (text.startsWith(prefix)) {
      text = `${lastMessageSenderDisplayName.value}: ${text.slice(prefix.length)}`
    }
  }

  if (props.messageFormatter) {
    return props.messageFormatter(text, MESSAGE_TYPE.TEXT)
  }
  return text
})
</script>

<template>
  <Cell
    v-bind="$attrs"
    auto-height
    :class="[props.class, { 'is-pinned': conversation.isPinned, 'is-muted': conversation.isMuted, 'has-at-me': effectiveHasAtMe }]"
    @click="onClick"
    @contextmenu="onContextMenu"
    @touchstart="longPress.start"
    @touchmove="longPress.move"
    @touchend="longPress.end"
    @touchcancel="longPress.cancel"
  >
    <template #leading>
      <Avatar :name="conversationName" :src="conversationAvatar" :size="48" :presence="peerPresence" />
      <slot name="item-prefix" />
    </template>
    <div class="conversation-item__info">
      <div class="conversation-item__top">
        <div class="conversation-item__name-wrap">
          <span class="conversation-item__name" :class="{ 'is-at-me': effectiveHasAtMe }">
            <Icon
              v-if="effectiveHasAtMe"
              name="at"
              :size="14"
              class="conversation-item__at-me-icon"
            />
            {{ conversationName }}
          </span>
          <span v-if="props.conversation.isPinned" class="conversation-item__pin-badge">
            <Icon name="pin/fill" :size="12" />
          </span>
          <Transition name="uikit-mute-badge">
            <span
              v-if="props.conversation.isMuted"
              class="conversation-item__mute-badge"
              @animationend="onMuteBadgeAnimEnd"
            >
              <Icon name="bell/slash" :size="12" :anim="muteShaking ? 'shake' : undefined" />
            </span>
          </Transition>
        </div>
        <span v-if="displayTime" class="conversation-item__time">
          {{ displayTime }}
        </span>
      </div>
      <div class="conversation-item__bottom">
        <span class="conversation-item__message">
          <template v-if="props.isTyping">
            <span class="typing-dots" aria-hidden="true">
              <span class="typing-dots__dot" />
              <span class="typing-dots__dot" />
              <span class="typing-dots__dot" />
            </span>
            <span class="conversation-item__typing-text">{{ displayMessage }}</span>
          </template>
          <template v-else>
            <span v-if="effectiveHasAtMe" class="conversation-item__at-me-prefix">{{ t('conversation.atMeInMessage', '@我的') }}</span>
            <Icon
              v-if="displayDraft"
              name="rect/pencil"
              :size="14"
              class="conversation-item__draft-icon"
            />
            <span v-if="displayDraft" class="conversation-item__draft">[{{ t('conversation.draft') }}]</span>{{ displayMessage }}
          </template>
        </span>
        <Badge
          v-if="props.conversation.unreadCount"
          :count="props.conversation.unreadCount"
          :dot="props.unreadMode === 'dot' || props.conversation.isMuted"
          :color="props.conversation.isMuted ? 'var(--uikit-text-secondary)' : undefined"
          size="small"
        />
      </div>
      <slot name="item-suffix" />
    </div>
  </Cell>

  <!-- PC 右键菜单 -->
  <Popup
    :show="showContextMenu"
    :anchor="contextMenuAnchor"
    placement="bottom"
    :overlay="false"
    :close-on-click-overlay="true"
    group="conversation-context-menu"
    @update:show="onContextMenuClose"
    @close="onContextMenuClose"
  >
    <div class="context-menu">
      <div
        v-for="item in contextMenuItems"
        :key="item.action"
        class="context-menu__item"
        :class="{ 'is-danger': item.danger }"
        @click.stop="onContextMenuItemClick(item.action)"
      >
        <Transition name="uikit-icon-swap" mode="out-in">
          <Icon v-if="item.icon" :key="item.icon" :name="item.icon" :size="14" />
        </Transition>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </Popup>

  <!-- H5 长按 ActionSheet -->
  <ActionSheet
    v-model:show="showActionSheet"
    :actions="actionSheetActions"
    @select="onActionSheetSelect"
  />
</template>

<style scoped>
/* 会话项状态覆盖 EmCell 根样式 */
.uikit-cell.is-pinned {
  background-color: rgba(var(--uikit-primary-rgb), 0.04);
  border-radius: var(--uikit-item-active-radius);
}

.uikit-cell.has-at-me {
  background-color: rgba(var(--uikit-primary-rgb), 0.1);
}

/* leading slot 内 Avatar 与 prefix slot 间距 */
:deep(.uikit-cell__leading) {
  gap: 12px;
}

.conversation-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-item__top,
.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__name-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.conversation-item__name {
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item__name.is-at-me {
  color: var(--uikit-primary);
  font-weight: 600;
}

.conversation-item__at-me-icon {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 2px;
  color: var(--uikit-primary);
}

.conversation-item__pin-badge {
  display: inline-flex;
  align-items: center;
  color: var(--uikit-primary);
  flex-shrink: 0;
}

.conversation-item__mute-badge {
  display: inline-flex;
  align-items: center;
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
  transform-origin: top center;
}

/* 免打扰徽标出现/消失过渡（开启时淡入并叠加摇铃动画，取消时淡出缩小） */
.uikit-mute-badge-enter-active,
.uikit-mute-badge-leave-active {
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-mute-badge-enter-from,
.uikit-mute-badge-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.conversation-item__time {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.conversation-item__message {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.conversation-item__draft {
  color: var(--uikit-danger-color);
  margin-right: 2px;
}

.conversation-item__draft-icon {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 2px;
  color: var(--uikit-danger-color);
}

.conversation-item__typing-text {
  color: var(--uikit-primary);
  font-weight: 500;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 4px;
  color: var(--uikit-primary);
}

.typing-dots__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: currentColor;
  animation: typing-bounce 1.4s ease-in-out infinite both;
}

.typing-dots__dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots__dot:nth-child(2) {
  animation-delay: 0.16s;
}

.typing-dots__dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typing-dots__dot {
    animation: none;
    opacity: 1;
  }
}

.conversation-item__at-me-prefix {
  color: var(--uikit-primary);
  font-weight: 500;
  margin-right: 2px;
}

/* PC 右键菜单 —— 外层外壳由 Popup 统一提供，此处只负责内容布局。 */
.context-menu {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 6px;
}

/* 菜单项 —— 自身带圆角，hover 时是独立的圆角色块（不贴卡片边） */
.context-menu__item {
  padding: 10px 12px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--uikit-components-radius);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (hover: hover) {
  .context-menu__item:hover {
    background-color: var(--uikit-bg-hover);
  }
}

.context-menu__item.is-danger {
  color: var(--uikit-danger-color);
}

/* 菜单项图标状态切换过渡（如免打扰 bell ↔ bell_slash） */
.uikit-icon-swap-enter-active,
.uikit-icon-swap-leave-active {
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    transform var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
}

.uikit-icon-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
}

@media (hover: hover) {
  .context-menu__item.is-danger:hover {
    background-color: rgba(var(--uikit-danger-rgb), 0.08);
  }
}
</style>
