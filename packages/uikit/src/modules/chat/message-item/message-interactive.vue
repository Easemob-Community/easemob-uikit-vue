<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import { useLongPress } from '../../../composables/use-long-press'
import { useToast } from '../../../composables/use-toast'
import { useUIKit } from '../../../composables/use-uikit'
import { useGroupStore } from '../../../store/group'
import { resolveTranslateLang } from '../../../composables/use-message-actions'
import { CONVERSATION_TYPE, GROUP_MEMBER_ROLE, MESSAGE_TYPE } from '../../../constants'
import Popup from '../../../components/popup/popup.vue'
import ActionSheet from '../../../components/action-sheet/action-sheet.vue'
import MessageActionMenu from '../message-action-menu/message-action-menu.vue'
import type { UiMessage } from '../../../sdk/types'
import type { ChatConfig, MessageActionEvent, MessageActionItem, MessageActionType } from '../types'

export interface MessageInteractiveProps {
  message: UiMessage
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
const { domains } = useUIKit()
const groupStore = useGroupStore()

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

/** 当前用户是否为群聊的群主/管理员，可撤回他人消息 */
const canRecallOther = computed(() => {
  if (props.config?.enableRecallOther === false)
    return false
  if (props.message.isSelf)
    return false
  if (props.message.conversationType !== CONVERSATION_TYPE.GROUPCHAT)
    return false
  if (props.message.recalled)
    return false
  const groupId = props.message.conversationId
  if (!groupId)
    return false
  const group = groupStore.getGroupById(groupId)
  // 优先使用消息中可能携带的当前用户身份；否则从群信息读取当前登录用户的角色
  const role = group?.role
  return role === GROUP_MEMBER_ROLE.OWNER || role === GROUP_MEMBER_ROLE.ADMIN
})

// 当群信息未预加载时（如从通知跳入），主动拉取一次群详情，
// 拉取成功后 groupStore 更新，canRecallOther 会重新计算。
const triedFetchRole = ref(false)
onMounted(() => {
  const groupId = props.message.conversationId
  if (
    props.message.conversationType === CONVERSATION_TYPE.GROUPCHAT
    && groupId
    && !groupStore.getGroupById(groupId)
    && !triedFetchRole.value
  ) {
    triedFetchRole.value = true
    domains.group.fetchGroupInfo(groupId).catch(() => {
      // 无权限或群不存在时静默失败，不阻断菜单展示
    })
  }
})

/** 根据配置生成菜单项 */
const actions = computed<MessageActionItem[]>(() => {
  const cfg = props.config
  const items: MessageActionItem[] = []

  const add = (type: MessageActionType, label: string, icon?: string, danger?: boolean, disabled?: boolean, disabledTip?: string) => {
    items.push({ type, label, icon, danger, disabled, disabledTip })
  }

  if (cfg?.enableQuote !== false)
    add('quote', t('message.action.quote') ?? '引用', 'arrows/arrow_turn_left')
  // 复制：仅文本消息支持；图片/视频/文件等类型暂不提供复制
  if (cfg?.enableCopy !== false && props.message.type === MESSAGE_TYPE.TEXT)
    add('copy', t('message.action.copy') ?? '复制', 'files-media/doc_on_doc')
  // 下载：仅文件消息在右键/长按菜单中提供下载入口
  if (cfg?.enableDownload !== false && props.message.type === MESSAGE_TYPE.FILE)
    add('download', t('message.action.download') ?? '下载', 'arrows/arrow_down_n_box')
  if (cfg?.enableForward !== false)
    add('forward', t('message.action.forward') ?? '转发', 'chat/3lines_n_arrow')
  if (cfg?.enableMultiSelect !== false)
    add('multiSelect', t('message.action.multiSelect') ?? '多选', 'actions/items_check')
  // 翻译：仅文本消息可翻译，其他类型不展示；已有译文且目标语言一致时菜单切换为「取消翻译 / 显示译文」，
  // 目标语言不一致时展示「翻译」以重新翻译为新语言（与 translateTextMessage 的 to === lang 判定保持一致）
  if (cfg?.enableTranslate !== false && props.message.type === MESSAGE_TYPE.TEXT) {
    const hasTranslation = !!props.message.translation?.text
    const translating = !!props.message.translating
    const translationMatchesLang = hasTranslation && props.message.translation?.to === resolveTranslateLang(cfg?.translateTargetLang)
    if (translationMatchesLang && !translating) {
      if (props.message.showTranslation !== false) {
        add('translate', t('message.action.cancelTranslate') ?? '取消翻译', 'misc/hanzinalpha_in_rect_slash')
      }
      else {
        add('translate', t('message.action.showTranslation') ?? '显示译文', 'misc/hanzinalpha_in_rect')
      }
    }
    else {
      add('translate', t('message.action.translate') ?? '翻译', 'misc/hanzinalpha_in_rect', false, translating, t('message.translate.loading') ?? '翻译中…')
    }
  }
  // 语音转文字：仅带 url 的语音消息展示；已有转写结果时菜单切换为「收起文字 / 显示文字」
  if (cfg?.enableVoiceToText !== false && props.message.type === MESSAGE_TYPE.VOICE && (props.message.body as any).url) {
    const hasVoiceText = !!props.message.voiceText?.text
    const transcribing = !!props.message.voiceTranscribing
    if (hasVoiceText && !transcribing) {
      if (props.message.showVoiceText !== false) {
        add('voiceToText', t('message.action.hideVoiceText') ?? '收起文字', 'misc/hanzi_in_rect_slash')
      }
      else {
        add('voiceToText', t('message.action.showVoiceText') ?? '显示文字', 'misc/hanzi_in_rect')
      }
    }
    else {
      add('voiceToText', t('message.action.voiceToText') ?? '转文字', 'misc/hanzi_in_rect', false, transcribing, t('message.voiceToText.loading') ?? '转文字中…')
    }
  }
  if (cfg?.enablePin !== false && !props.message.recalled) {
    if (props.message.pinned) {
      add('unpin', t('message.action.unpin') ?? '取消置顶', 'chat/unpin')
    }
    else {
      add('pin', t('message.action.pin') ?? '置顶', 'chat/pin')
    }
  }
  if (cfg?.enableRecall !== false && props.message.isSelf && !props.message.recalled) {
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
  // 群主/管理员撤回他人消息
  if (canRecallOther.value) {
    const expired = isRecallExpired.value
    const minutes = recallDurationMinutes.value
    add(
      'recallOther',
      t('message.action.recallOther') ?? '撤回',
      'arrows/arrow_Uturn_anti_clockwise',
      false,
      expired,
      t('message.recallExpired').replace('{duration}', String(minutes)) ?? `超过${minutes}分钟，无法撤回`,
    )
  }
  // 编辑：仅自己发送的文本消息（环信 SDK modifyMessage 仅文本类支持），且未被撤回
  if (
    cfg?.enableEdit !== false
    && props.message.isSelf
    && !props.message.recalled
    && props.message.type === MESSAGE_TYPE.TEXT
  ) {
    // SDK modifyMessage 单条消息编辑次数上限为 5 次
    const count = props.message.modifiedInfo?.operationCount ?? 0
    const limitReached = count >= 5
    add(
      'edit',
      t('message.action.edit') ?? '编辑',
      'chat/modifyMsg',
      false,
      limitReached,
      t('message.edit.limitReached') ?? '此消息编辑次数已达上限',
    )
  }
  if (cfg?.enableDelete !== false)
    add('delete', t('message.action.delete') ?? '删除', 'actions/trash', true)

  return items
})

/** ActionSheet 格式化的 actions */
const actionSheetActions = computed(() =>
  actions.value.map(item => ({
    name: item.label,
    color: item.danger ? '#ef4444' : undefined,
    disabled: item.disabled,
    icon: item.icon,
  })),
)

/** PC 端右键菜单 */
function onContextMenu(event: MouseEvent) {
  if (isMobile.value)
    return
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

/** H5 端长按触发 */
const longPress = useLongPress(() => {
  if (!isMobile.value)
    return
  showActionSheet.value = true
})

/** 处理菜单项选择 */
function handleSelect(actionType: MessageActionType, actionItem?: MessageActionItem) {
  if (actionItem?.disabled) {
    const tip = actionItem.disabledTip || t('message.action.unavailable', '操作不可用')
    showToast(tip, 'warning')
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
    @touchmove="longPress.move"
    @touchend="longPress.end"
    @touchcancel="longPress.cancel"
  >
    <slot />
  </div>

  <!-- PC 端：Popup 锚定菜单（group 保证同一分组内只有一个打开） -->
  <Popup
    :show="showPopup"
    :anchor="anchorRef"
    placement="bottom"
    :overlay="false"
    :close-on-click-overlay="true"
    group="message-action"
    @update:show="onPopupClose"
    @close="onPopupClose"
  >
    <MessageActionMenu :actions="actions" @select="onMenuSelect">
      <template #extra>
        <slot name="message-action-extra" :message="props.message" />
      </template>
    </MessageActionMenu>
  </Popup>

  <!-- H5 端：ActionSheet 底部菜单 -->
  <ActionSheet
    :show="showActionSheet"
    :actions="actionSheetActions"
    @update:show="showActionSheet = $event"
    @select="onActionSheetSelect"
  >
    <slot name="message-action-extra" :message="props.message" />
  </ActionSheet>
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
