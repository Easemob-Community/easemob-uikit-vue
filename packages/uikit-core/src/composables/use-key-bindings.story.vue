<script setup lang="ts">
/**
 * 键盘操作 hooks 演示：useKeyBindings / useEscToClose / useArrowNavigation
 *
 * - Esc 关闭：useEscToClose 封装，active 为弹层打开状态时生效，关闭即解绑
 * - 方向键导航：useArrowNavigation 提供 ↑/↓ 索引移动（支持回绕与边界）
 * - 全局开关：setKeyboardShortcutsEnabled 关闭后所有绑定立即失效
 */
import { computed, onUnmounted, ref } from 'vue'
import Cell from '../components/cell/cell.vue'
import Popup from '../components/popup/popup.vue'
import {
  isKeyboardShortcutsEnabled,
  setKeyboardShortcutsEnabled,
  useArrowNavigation,
  useEscToClose,
  useKeyBindings,
} from './use-key-bindings'

/* ===== Variant 1：Esc 关闭（useEscToClose） ===== */
/** 模拟弹层开关：active 为 true 时按 Esc 关闭 */
const escActive = ref(false)
useEscToClose(escActive, () => {
  escActive.value = false
})

/* ===== Variant 2：方向键列表导航（useArrowNavigation + useKeyBindings） ===== */
const cellTypes = [
  { key: 'compact', label: 'Compact 紧凑', size: 'compact' as const },
  { key: 'normal', label: 'Normal 标准', size: 'normal' as const },
  { key: 'large', label: 'Large 宽松', size: 'large' as const },
  { key: 'disabled', label: '禁用状态', size: 'normal' as const, disabled: true },
]
const { activeIndex, setIndex } = useArrowNavigation({ count: cellTypes.length, wrap: true })
const currentCell = computed(() => cellTypes[activeIndex.value])
const showNavPreview = ref(false)
useKeyBindings({
  Enter: () => {
    if (!currentCell.value.disabled)
      showNavPreview.value = true
  },
})

/* ===== Variant 3：全局开关（setKeyboardShortcutsEnabled） ===== */
const shortcutsOn = ref(isKeyboardShortcutsEnabled())
function toggleShortcuts() {
  shortcutsOn.value = !shortcutsOn.value
  setKeyboardShortcutsEnabled(shortcutsOn.value)
}
// 离开本演示时恢复全局开关，避免影响其它 Variant
onUnmounted(() => setKeyboardShortcutsEnabled(true))
</script>

<template>
  <Story title="useKeyBindings">
    <Variant title="Esc 关闭（useEscToClose）">
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
        点击「打开弹层」后按 <b>Esc</b> 关闭；active 由弹层状态控制，关闭即解绑监听。
      </div>
      <button
        style="padding: 8px 16px; border-radius: 6px; border: none; background: hsl(203, 100%, 60%); color: #fff; cursor: pointer;"
        @click="escActive = true"
      >
        打开弹层
      </button>
      <div
        v-if="escActive"
        style="margin-top: 16px; width: 320px; padding: 32px; border: 1px dashed #e5e7eb; border-radius: 8px; text-align: center;"
      >
        模拟弹层内容（非 Popup 组件，演示 hook 独立使用）<br><br>
        按 <b>Esc</b> 关闭
      </div>
    </Variant>

    <Variant title="方向键导航（useArrowNavigation）">
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
        ↑ / ↓ 切换类型（回绕）· <b>Enter</b> 打开预览 · 点击列表项也可选中
      </div>
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <Cell
          v-for="(item, i) in cellTypes"
          :key="item.key"
          :title="item.label"
          :size="item.size"
          :disabled="item.disabled"
          :active="i === activeIndex && !item.disabled"
          border
          @click="setIndex(i)"
        />
      </div>
      <div style="margin-top: 8px; font-size: 13px; color: #6b7280;">
        当前：{{ currentCell.label }}
      </div>

      <Popup v-model:show="showNavPreview">
        <div style="padding: 24px; text-align: center;">
          {{ currentCell.label }} 预览<br><br>
          <button
            style="padding: 6px 12px; border-radius: 6px; border: none; background: hsl(203, 100%, 60%); color: #fff; cursor: pointer;"
            @click="showNavPreview = false"
          >
            关闭（Esc）
          </button>
        </div>
      </Popup>
    </Variant>

    <Variant title="全局开关（setKeyboardShortcutsEnabled）">
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
        关闭后下方列表的 ↑ / ↓ 导航、弹层的 Esc 关闭等<b>全部</b>键盘绑定立即失效（切换离开本演示自动恢复）。
      </div>
      <button
        style="padding: 8px 16px; border-radius: 6px; border: none; background: hsl(203, 100%, 60%); color: #fff; cursor: pointer;"
        @click="toggleShortcuts"
      >
        {{ shortcutsOn ? '关闭全局键盘操作' : '开启全局键盘操作' }}
      </button>
      <div style="margin-top: 12px; font-size: 13px; color: #6b7280;">
        当前状态：{{ shortcutsOn ? '已开启' : '已关闭' }}
      </div>
      <div style="margin-top: 12px; width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <Cell
          v-for="(item, i) in cellTypes"
          :key="item.key"
          :title="item.label"
          :size="item.size"
          :active="i === activeIndex && !item.disabled"
          border
          @click="setIndex(i)"
        />
      </div>
    </Variant>
  </Story>
</template>
