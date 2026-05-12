<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import { useLongPress } from '../../../composables/use-long-press'
import { useToast } from '../../../composables/use-toast'
import Popup from '../../../components/popup/popup.vue'
import ActionSheet from '../../../components/action-sheet/action-sheet.vue'
import MessageActionMenu from '../message-action-menu/message-action-menu.vue'
import type { Message } from '../../../store/message'
import type { ChatConfig, MessageActionItem, MessageActionEvent, MessageActionType } from '../types'

/** 全局事件名：用于互斥关闭其他菜单 */
const MENU_CLOSE_EVENT = 'uikit:message-action-menu-close'

export interface MessageInteractiveProps {
  message: Message
  config?: ChatConfig['messageAction']
}

export interface MessageInteractiveEmits {
  (e: 'action', event: MessageActionEvent): void
}

const props = defineProps<MessageInteractiveProps>()
const emit = defineEmits<MessageInteractiveEmits>()

const { t } = useLocale()
const { isMobile } = useViewport()
const { show: showToast } = useToast()

/** 当前实例标识，用于全局互斥 */
const instanceId = Symbol('message-interactive')

/** 触发元素引用 */
const triggerRef = ref<HTMLElement>()
/** 右键/长按时的锚点元素 */
const anchorRef = ref<HTMLElement>()
/** PC popup 显示状态 */
const showPopup = ref(false)
/** H5 action-sheet 显示状态 */
const showActionSheet = ref(false)
/** 当前是否处于激活（右键/长按）高亮状态 */
const isActive = ref(false)

/** 撤回时效：默认 2 分钟 */
const RECALL_DISABLE_DURATION_DEFAULT = 2 * 60 * 1000

/** 判断消息是否已超过撤回时效 */
const isRecallExpired = computed(() => {
  const duration = props.config?.recallDisableDuration ?? RECALL_DISABLE_DURATION_DEFAULT
  const now = Date.now()
  const msgTime = props.message.timestamp || now
  return now - msgTime > duration
})

/** 撤回禁用时长（分钟，用于提示文案） */
const recallDurationMinutes = computed(() => {
  const duration = props.config?.recallDisableDuration ?? RECALL_DISABLE_DURATION_DEFAULT
  return Math.round(duration / 60 / 1000)
})

/** 根据配置生成菜单项 */
const actions = computed<MessageActionItem[]>(() => {
  const cfg = props.config
  const items: MessageActionItem[] = []

  const add = (type: MessageActionType, label: string, icon?: string, danger?: boolean, disabled?: boolean, disabledTip?: string) => {
    items.push({ type, label, icon, danger, disabled, disabledTip })
  }

  if (cfg?.enableQuote !== false) add('quote', t('message.action.quote') ?? '引用', 'chat/3lines_n_arrow')
  if (cfg?.enableCopy !== false) add('copy', t('message.action.copy') ?? '复制', 'actions/check_2')
  if (cfg?.enableForward !== false) add('forward', t('message.action.forward') ?? '转发', 'chat/airplane')
  if (cfg?.enableMultiSelect !== false) add('multiSelect', t('message.action.multiSelect') ?? '多选', 'actions/checked_rectangle')
  if (cfg?.enableTranslate) add('translate', t('message.action.translate') ?? '翻译', 'misc/globe_asia-australia')
  if (cfg?.enablePin) add('pin', t('message.action.pin') ?? '置顶', 'actions/star')
  if (cfg?.enableRecall !== false && !props.message.recalled) {
    const expired = isRecallExpired.value
    const minutes = recallDurationMinutes.value
    add(
      'recall',
      t('message.action.recall') ?? '撤回',
      'arrows/arrow_Uturn_anti_clockwise',
      false,
      expired,
      t('message.recallExpired').replace('{duration}', String(minutes)) ?? `超过${minutes}分钟，无法撤回`,
    )
  }
  if (cfg?.enableDelete !== false) add('delete', t('message.action.delete') ?? '删除', 'actions/trash', true)

  return items
})

/** ActionSheet 格式化的 actions */
const actionSheetActions = computed(() =>
  actions.value.map((item) => ({
    name: item.label,
    color: item.danger ? '#ef4444' : undefined,
  }))
)

/** PC 端右键菜单 */
function onContextMenu(event: MouseEvent) {
  if (isMobile.value) return
  event.preventDefault()

  // 全局互斥：通知其他实例关闭菜单
  document.dispatchEvent(new CustomEvent(MENU_CLOSE_EVENT, { detail: instanceId }))

  isActive.value = true
  // 创建一个临时元素作为锚点
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = `${event.clientX}px`
  el.style.top = `${event.clientY}px`
  el.style.width = '1px'
  el.style.height = '1px'
  document.body.appendChild(el)
  anchorRef.value = el
  showPopup.value = true
}

/** 关闭 popup 时清理锚点 */
function onPopupClose() {
  closePopup()
}

/** 关闭 popup 并清理状态 */
function closePopup() {
  if (showPopup.value) {
    showPopup.value = false
    isActive.value = false
    if (anchorRef.value) {
      document.body.removeChild(anchorRef.value)
      anchorRef.value = undefined
    }
  }
}

/** 监听全局关闭事件：其他实例打开菜单时，关闭自己的菜单 */
function onGlobalClose(event: Event) {
  const customEvent = event as CustomEvent<symbol>
  if (customEvent.detail !== instanceId && showPopup.value) {
    closePopup()
  }
}

onMounted(() => {
  document.addEventListener(MENU_CLOSE_EVENT, onGlobalClose)
})

onUnmounted(() => {
  document.removeEventListener(MENU_CLOSE_EVENT, onGlobalClose)
})

/** H5 端长按触发 */
const longPress = useLongPress(() => {
  if (!isMobile.value) return
  showActionSheet.value = true
})

/** 处理菜单项选择 */
function handleSelect(actionType: MessageActionType, actionItem?: MessageActionItem) {
  if (actionItem?.disabled) {
    const tip = actionItem.disabledTip || t('message.recallExpired') || '无法撤回'
    showToast(tip)
    return
  }
  showPopup.value = false
  showActionSheet.value = false
  isActive.value = false
  emit('action', { action: actionType, message: props.message })
  // 清理锚点
  if (anchorRef.value) {
    document.body.removeChild(anchorRef.value)
    anchorRef.value = undefined
  }
}

/** PC popup 菜单选择 */
function onMenuSelect(action: MessageActionItem) {
  handleSelect(action.type, action)
}

/** H5 action-sheet 选择 */
function onActionSheetSelect(_item: { name: string }, index: number) {
  const action = actions.value[index]
  if (action) {
    handleSelect(action.type, action)
  }
}
</script>

<template>
  <div
    ref="triggerRef"
    class="message-interactive"
    :class="{ 'message-interactive--active': isActive }"
    @contextmenu="onContextMenu"
    @touchstart="longPress.start"
    @touchend="longPress.end"
    @touchcancel="longPress.cancel"
  >
    <slot />
  </div>

  <!-- PC 端：Popup 锚定菜单 -->
  <Popup
    :show="showPopup"
    :anchor="anchorRef"
    placement="bottom"
    :overlay="false"
    :close-on-click-overlay="true"
    @update:show="onPopupClose"
    @close="onPopupClose"
  >
    <MessageActionMenu :actions="actions" @select="onMenuSelect" />
  </Popup>

  <!-- H5 端：ActionSheet 底部菜单 -->
  <ActionSheet
    :show="showActionSheet"
    :actions="actionSheetActions"
    @update:show="showActionSheet = $event"
    @select="onActionSheetSelect"
  />
</template>

<style scoped>
.message-interactive {
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.message-interactive--active::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 12px;
  background-color: var(--uikit-primary-color);
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
}
</style>
