<script setup lang="ts">
/**
 * 聊天室右键/点击上下文菜单（P5 PC 模式）：teleport 到弹层目标，fixed 定位，
 * 视口右下溢出自动翻转（钳制），点击外部 / Esc / 窗口 resize 关闭。
 *
 * 使用方式（成员/消息项绑定）：
 * ```vue
 * <ChatroomContextMenu
 *   v-model:show="menu.show"
 *   :x="menu.x" :y="menu.y" :items="menu.items"
 *   @select="handleSelect"
 * />
 * ```
 * 菜单项为纯配置（label / danger / disabled），业务决定内容与动作——
 * 与「壳子 vs 内容」哲学一致，UIKit 不预埋具体管理项。
 */
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useEscToClose } from '@easemob/uikit-core'
import { getChatroomPopupTarget } from '../../../config/popup-target'

export interface ChatroomContextMenuItem {
  /** 菜单项文案 */
  label: string
  /** 危险操作（红色文案，如踢人） */
  danger?: boolean
  /** 禁用项（置灰不可点） */
  disabled?: boolean
}

export interface ChatroomContextMenuProps {
  /** 是否显示（v-model:show 受控） */
  show: boolean
  /** 触发点坐标（clientX/clientY） */
  x: number
  /** 触发点坐标（clientY） */
  y: number
  /** 菜单项列表 */
  items: ChatroomContextMenuItem[]
}

const props = defineProps<ChatroomContextMenuProps>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  /** 选中菜单项（已自动关闭菜单） */
  (e: 'select', item: ChatroomContextMenuItem, index: number): void
}>()

const menuRef = ref<HTMLElement>()
/** 钳制后的实际定位（打开时按视口边界翻转） */
const pos = ref({ x: 0, y: 0 })

const VIEWPORT_PADDING = 8

/** 打开或坐标变化时重新钳制：右下溢出则翻转贴边 */
watch(
  [() => props.show, () => props.x, () => props.y],
  async ([show]) => {
    if (!show)
      return
    pos.value = { x: props.x, y: props.y }
    await nextTick()
    const el = menuRef.value
    if (!el)
      return
    const rect = el.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - VIEWPORT_PADDING
    const maxY = window.innerHeight - rect.height - VIEWPORT_PADDING
    pos.value = {
      x: Math.max(VIEWPORT_PADDING, Math.min(pos.value.x, maxX)),
      y: Math.max(VIEWPORT_PADDING, Math.min(pos.value.y, maxY)),
    }
  },
)

function handleSelect(item: ChatroomContextMenuItem, index: number) {
  if (item.disabled)
    return
  emit('select', item, index)
  emit('update:show', false)
}

function close() {
  if (props.show)
    emit('update:show', false)
}

// Esc 关闭（弹层语义优先，输入态也允许关闭）
useEscToClose(() => props.show, close, { ignoreWhenTyping: false })

// 点击外部关闭（capture 阶段：菜单内点击不关闭）
function onPointerDown(event: PointerEvent) {
  if (!props.show)
    return
  const el = menuRef.value
  if (el && !el.contains(event.target as Node))
    close()
}
document.addEventListener('pointerdown', onPointerDown, true)

// 窗口 resize / 滚动期间关闭（简单兜底，不做滚动跟随）
function onViewportChange() {
  close()
}
window.addEventListener('resize', onViewportChange)
window.addEventListener('scroll', onViewportChange, true)

onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <Teleport :to="getChatroomPopupTarget() ?? 'body'">
    <div
      v-if="show"
      ref="menuRef"
      class="chatroom-context-menu"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <button
        v-for="(item, index) in items"
        :key="index"
        class="chatroom-context-menu__item"
        :class="{
          'chatroom-context-menu__item--danger': item.danger,
          'chatroom-context-menu__item--disabled': item.disabled,
        }"
        :disabled="item.disabled"
        @click="handleSelect(item, index)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.chatroom-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 140px;
  max-width: 220px;
  padding: 4px;
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-elevated, #fff);
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}

.chatroom-context-menu__item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: none;
  text-align: left;
  font-size: 13px;
  color: var(--uikit-text-primary);
  cursor: pointer;
}

@media (hover: hover) {
  .chatroom-context-menu__item:hover {
    background: var(--uikit-bg-active, rgba(0, 0, 0, 0.05));
  }
}

.chatroom-context-menu__item--danger {
  color: var(--uikit-danger-color, #e5484d);
}

.chatroom-context-menu__item--disabled {
  color: var(--uikit-text-tertiary);
  cursor: not-allowed;
}
</style>
