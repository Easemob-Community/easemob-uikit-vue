<script setup lang="ts">
/**
 * 文档站交互式配置面板（站点级全局组件，theme/index.ts 注册为 <DocsConfigPanel>）
 *
 * 复刻 demo 应用设置面板的开关交互（互斥按钮组 / 复选框 / 数字输入 + 问号说明浮层），
 * 供各 demo 以声明式配置驱动：demo 只描述配置项（items 数组），面板按点分路径
 * 直接读写传入的响应式 model 对象，避免每个 demo 手写开关样板。
 *
 * 视觉对齐 demo 设置面板（demo-option / demo-check / demo-input），
 * 配色改用 VitePress --vp-* 变量以适配文档站暗色模式。
 */
import { ref } from 'vue'

export interface ConfigOption {
  /** 选项展示文本 */
  label: string
  /** 选项值 */
  value: unknown
}

export interface ConfigItem {
  /** 配置项标题 */
  label: string
  /** 说明文本（悬停问号展示），不传则不渲染问号 */
  tip?: string
  /** 控件类型：select 互斥按钮组 / boolean 复选框 / number 数字输入 */
  type: 'select' | 'boolean' | 'number'
  /** model 对象中的点分路径键，如 'showAvatar'、'messageStatus.style' */
  key: string
  /** select 类型选项 */
  options?: ConfigOption[]
  /** number 类型取值范围 */
  min?: number
  max?: number
  step?: number
  /** 数字输入旁的文本（如单位 px） */
  text?: string
}

const props = defineProps<{
  /** 配置数据对象（响应式），面板按 items[].key 读写 */
  model: Record<string, any>
  /** 配置项声明 */
  items: ConfigItem[]
  /** 面板标题 */
  title?: string
}>()

/** 读取点分路径值 */
function getByPath(key: string): unknown {
  return key.split('.').reduce((acc: any, seg) => acc?.[seg], props.model)
}

/** 写入点分路径值（中间对象缺失时自动补齐） */
function setByPath(key: string, value: unknown) {
  const segs = key.split('.')
  let target: any = props.model
  for (let i = 0; i < segs.length - 1; i++) {
    if (typeof target[segs[i]] !== 'object' || target[segs[i]] === null)
      target[segs[i]] = {}
    target = target[segs[i]]
  }
  target[segs[segs.length - 1]] = value
}

/** 问号说明浮层坐标 */
interface TipState {
  text: string
  top: number
  left: number
}

/** 问号说明浮层状态：fixed 定位避免被 demo 滚动容器裁剪，同一时刻只显示一个 */
const tipState = ref<TipState | null>(null)
const tipRef = ref<HTMLElement>()

function showTip(event: FocusEvent | MouseEvent, text: string) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const gap = 8
  tipState.value = { text, top: rect.bottom + gap, left: rect.left }
  // 先以锚点坐标渲染，下一帧按浮层实际尺寸做视口边界修正
  requestAnimationFrame(() => {
    const popup = tipRef.value
    if (!popup || !tipState.value)
      return
    const popupRect = popup.getBoundingClientRect()
    let top = rect.bottom + gap
    if (top + popupRect.height > window.innerHeight - gap)
      top = Math.max(gap, rect.top - popupRect.height - gap)
    const left = Math.min(Math.max(gap, rect.left), window.innerWidth - popupRect.width - gap)
    tipState.value = { ...tipState.value, top, left }
  })
}

function hideTip() {
  tipState.value = null
}

function isActive(item: ConfigItem, option: ConfigOption) {
  return getByPath(item.key) === option.value
}
</script>

<template>
  <div class="docs-config-panel">
    <div v-if="title" class="docs-config-panel__title">
      {{ title }}
    </div>
    <div
      v-for="item in items"
      :key="item.key"
      class="docs-config-panel__item"
    >
      <div class="docs-config-panel__label">
        <span>{{ item.label }}</span>
        <span
          v-if="item.tip"
          class="docs-config-panel__help"
          tabindex="0"
          aria-label="查看配置说明"
          @mouseenter="showTip($event, item.tip)"
          @mouseleave="hideTip"
          @focus="showTip($event, item.tip)"
          @blur="hideTip"
        >?</span>
      </div>

      <!-- 互斥选项组 -->
      <div v-if="item.type === 'select'" class="docs-config-panel__options">
        <button
          v-for="option in item.options"
          :key="String(option.value)"
          class="docs-config-panel__option"
          :class="{ 'docs-config-panel__option--active': isActive(item, option) }"
          type="button"
          @click="setByPath(item.key, option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- 布尔开关 -->
      <label v-else-if="item.type === 'boolean'" class="docs-config-panel__check">
        <input
          type="checkbox"
          :checked="!!getByPath(item.key)"
          @change="setByPath(item.key, ($event.target as HTMLInputElement).checked)"
        >
        <span>{{ getByPath(item.key) ? '开启' : '关闭' }}</span>
      </label>

      <!-- 数字输入 -->
      <div v-else class="docs-config-panel__number">
        <input
          :value="getByPath(item.key)"
          type="number"
          :min="item.min"
          :max="item.max"
          :step="item.step ?? 1"
          @input="setByPath(item.key, Number(($event.target as HTMLInputElement).value))"
        >
        <span v-if="item.text">{{ item.text }}</span>
      </div>
    </div>

    <!-- 问号说明浮层（fixed 定位 + 视口修正） -->
    <Transition name="docs-config-tip-fade">
      <div
        v-if="tipState"
        ref="tipRef"
        class="docs-config-panel__popup"
        role="tooltip"
        :style="{ top: `${tipState.top}px`, left: `${tipState.left}px` }"
      >
        {{ tipState.text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.docs-config-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.docs-config-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.docs-config-panel__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.docs-config-panel__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  letter-spacing: 0.4px;
}

.docs-config-panel__help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid var(--vp-c-text-3);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: var(--vp-c-text-3);
  cursor: help;
  outline: none;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.docs-config-panel__help:hover,
.docs-config-panel__help:focus-visible {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.docs-config-panel__options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.docs-config-panel__option {
  padding: 3px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}

.docs-config-panel__option:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.docs-config-panel__option--active {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.docs-config-panel__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.docs-config-panel__check input {
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

.docs-config-panel__number {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.docs-config-panel__number input {
  width: 72px;
  padding: 3px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  line-height: 1.6;
}

.docs-config-panel__number input:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.docs-config-panel__number span {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.docs-config-panel__popup {
  position: fixed;
  z-index: 10000;
  max-width: 280px;
  padding: 8px 10px;
  border-radius: 6px;
  background-color: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: normal;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.docs-config-tip-fade-enter-active,
.docs-config-tip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.docs-config-tip-fade-enter-from,
.docs-config-tip-fade-leave-to {
  opacity: 0;
}
</style>
