<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import { useLongPress } from '../../../composables/use-long-press'
import Popup from '../../../components/popup/popup.vue'
import ActionSheet from '../../../components/action-sheet/action-sheet.vue'
import MessageActionMenu from '../message-action-menu/message-action-menu.vue'
import type { Message } from '../../../store/message'
import type { ChatConfig, MessageActionItem, MessageActionEvent, MessageActionType } from '../types'

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

/** 根据配置生成菜单项 */
const actions = computed<MessageActionItem[]>(() => {
  const cfg = props.config
  const items: MessageActionItem[] = []

  const add = (type: MessageActionType, label: string, icon?: string, danger?: boolean) => {
    items.push({ type, label, icon, danger })
  }

  if (cfg?.enableQuote !== false) add('quote', t('message.action.quote') ?? '引用', 'chat/3lines_n_arrow')
  if (cfg?.enableCopy !== false) add('copy', t('message.action.copy') ?? '复制', 'actions/check_2')
  if (cfg?.enableForward !== false) add('forward', t('message.action.forward') ?? '转发', 'chat/airplane')
  if (cfg?.enableMultiSelect !== false) add('multiSelect', t('message.action.multiSelect') ?? '多选', 'actions/checked_rectangle')
  if (cfg?.enableTranslate) add('translate', t('message.action.translate') ?? '翻译', 'misc/globe_asia-australia')
  if (cfg?.enablePin) add('pin', t('message.action.pin') ?? '置顶', 'actions/star')
  if (cfg?.enableRecall !== false && !props.message.recalled) add('recall', t('message.action.recall') ?? '撤回', 'arrows/arrow_Uturn_anti_clockwise')
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
  showPopup.value = false
  isActive.value = false
  if (anchorRef.value) {
    document.body.removeChild(anchorRef.value)
    anchorRef.value = undefined
  }
}

/** H5 端长按触发 */
const longPress = useLongPress(() => {
  if (!isMobile.value) return
  showActionSheet.value = true
})

/** 处理菜单项选择 */
function handleSelect(actionType: MessageActionType) {
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
  handleSelect(action.type)
}

/** H5 action-sheet 选择 */
function onActionSheetSelect(_item: { name: string }, index: number) {
  const action = actions.value[index]
  if (action) {
    handleSelect(action.type)
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
