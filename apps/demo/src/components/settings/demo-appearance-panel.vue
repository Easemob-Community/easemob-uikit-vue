<script setup lang="ts">
/**
 * 设置面板 - 外观
 *
 * 包含：主题模式 / 主题色 / Hover 风格 / 头像·气泡·组件形状 / 容器间距 /
 * 动画开关·强度·波纹 / Input 组件风格实时预览 / 键盘操作（开关 + Cell 类型切换演示）/ 语言
 *
 * 说明：直接消费 useTheme / useUIKit(theme) / useLocale，改动即时作用于全局主题；
 * Input 风格与预览值来自 useDemoSettings（输入框演示属于聊天面板，风格演示留在外观）；
 * 键盘操作开关调用 setKeyboardShortcutsEnabled 全局生效（外观面板的交互偏好）。
 */
import { computed, ref } from 'vue'
import {
  EmCell,
  EmInput,
  EmPopup,
  useArrowNavigation,
  useEscToClose,
  useKeyBindings,
  useLocale,
  useTheme,
  useUIKit,
} from '@easemob/uikit'
import { useDemoSettings } from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const {
  mode,
  primaryColor,
  hoverStyle,
  containerGap,
  fontSizeScale,
  density,
  bubbleBgOther,
  bubbleBgSelf,
  chatBg,
  inputBg,
  animationEnabled,
  animationLevel,
  animationRipple,
  setMode,
  setPrimaryColor,
  setHoverStyle,
  setContainerGap,
  setFontSize,
  setDensity,
  setAnimationEnabled,
  setAnimationLevel,
  setAnimationRipple,
  setBubbleBg,
  setChatBg,
  setInputBg,
} = useTheme()
const { theme: themeStore } = useUIKit()
const { locale, setLocale } = useLocale()
const { inputVariant, inputDemoValue, keyboardShortcutsEnabled, toggleKeyboardShortcuts } = useDemoSettings()

function updatePrimaryColor(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  setPrimaryColor(val)
}

/* ===== Cell 类型键盘切换演示（useArrowNavigation + useKeyBindings + useEscToClose 示例） ===== */

interface CellTypeItem {
  key: string
  label: string
  size: 'compact' | 'normal' | 'large'
  /** 状态覆盖：active / disabled */
  state?: 'active' | 'disabled'
}

const cellTypes: CellTypeItem[] = [
  { key: 'compact', label: 'Compact 紧凑', size: 'compact' },
  { key: 'normal', label: 'Normal 标准', size: 'normal' },
  { key: 'large', label: 'Large 宽松', size: 'large' },
  { key: 'active', label: '激活状态', size: 'normal', state: 'active' },
  { key: 'disabled', label: '禁用状态', size: 'normal', state: 'disabled' },
]

/** 演示区是否持有键盘焦点：仅聚焦时 ↑/↓ 才响应（active 条件控制示例） */
const navActive = ref(false)
const navBoxRef = ref<HTMLElement>()

const { activeIndex, setIndex } = useArrowNavigation({
  count: cellTypes.length,
  wrap: true,
  active: navActive,
})
const currentCell = computed(() => cellTypes[activeIndex.value])

/** Enter 打开当前类型的预览 popup */
const showPreview = ref(false)
useKeyBindings({
  Enter: () => {
    if (navActive.value && !showPreview.value)
      showPreview.value = true
  },
}, { active: navActive })

/** Esc 退出演示区聚焦态（预览 popup 的 Esc 关闭由 EmPopup 内置的 useEscToClose 处理） */
useEscToClose(computed(() => navActive.value && !showPreview.value), () => {
  navBoxRef.value?.blur()
})

/** 演示区提示文案：未聚焦 / 聚焦可用 / 全局关闭三种状态 */
const navTip = computed(() => {
  if (!navActive.value)
    return '点击此处聚焦，使用键盘操作'
  return keyboardShortcutsEnabled.value
    ? '↑ / ↓ 切换类型 · Enter 预览 · Esc 退出'
    : '键盘操作已关闭，点击上方「开启」后可用'
})
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="主题模式"
        tip="全局明暗主题：亮色 / 暗色 / 跟随系统（跟随系统时随系统深浅自动切换）"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': mode === 'light' }"
          @click="setMode('light')"
        >
          亮色
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': mode === 'dark' }"
          @click="setMode('dark')"
        >
          暗色
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': mode === 'auto' }"
          @click="setMode('auto')"
        >
          跟随系统
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="主题色"
        tip="调整 UIKIT 主色调（色相 0-360），影响按钮、选中态、链接等主色元素"
      />
      <div class="demo-settings__color">
        <input
          type="range"
          min="0"
          max="360"
          :value="primaryColor"
          class="demo-slider"
          @input="updatePrimaryColor"
        />
        <div
          class="demo-color-preview"
          :style="{ backgroundColor: `hsl(${primaryColor}, 100%, 60%)` }"
        />
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="Hover 风格"
        tip="列表项（会话 / 联系人等）的悬停样式：默认整行高亮；圆角卡片带圆角与左右缩进"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': hoverStyle === 'default' }"
          @click="setHoverStyle('default')"
        >
          默认
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': hoverStyle === 'rounded' }"
          @click="setHoverStyle('rounded')"
        >
          圆角卡片
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="头像形状"
        tip="全局头像形状：圆形（50% 圆）或圆角方形（8px 圆角）。未单独指定形状的头像统一生效"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.avatarShape === 'circle' }"
          @click="themeStore.setAvatarShape('circle')"
        >
          圆形
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.avatarShape === 'square' }"
          @click="themeStore.setAvatarShape('square')"
        >
          圆角方形
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="气泡形状"
        tip="消息气泡的圆角大小：大圆角为默认样式，小圆角约 4px（接近直角但保留过渡）"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.bubbleShape === 'ground' }"
          @click="themeStore.setBubbleShape('ground')"
        >
          大圆角
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.bubbleShape === 'square' }"
          @click="themeStore.setBubbleShape('square')"
        >
          小圆角
        </button>
      </div>
      <div class="demo-info">
        影响消息气泡的圆角大小：大圆角为默认样式，小圆角约 4px（接近直角但保留过渡）。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="组件圆角"
        tip="输入框、按钮、弹层、列表项等控件的圆角大小。消息气泡的圆角由「气泡形状」控制"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.componentsShape === 'ground' }"
          @click="themeStore.setComponentsShape('ground')"
        >
          大圆角（8px）
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.componentsShape === 'square' }"
          @click="themeStore.setComponentsShape('square')"
        >
          小圆角（4px）
        </button>
      </div>
      <div class="demo-info">
        影响输入框、按钮、弹层、列表项等控件的圆角大小。消息气泡的圆角请用上方的「气泡形状」调整。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="容器间距"
        tip="聊天输入区（工具栏、表情面板等）各元素之间的间距"
      />
      <div class="demo-settings__color">
        <input
          type="range"
          min="0"
          max="24"
          :value="containerGap"
          class="demo-slider"
          style="background: linear-gradient(to right, #e5e7eb, var(--uikit-primary-color, hsl(203, 100%, 60%)));"
          @input="(e: Event) => setContainerGap(Number((e.target as HTMLInputElement).value))"
        />
        <span style="font-size: 13px; color: var(--uikit-text-secondary, #6b7280); min-width: 28px; text-align: right;">{{ containerGap }}px</span>
      </div>
      <div class="demo-info">
        调整聊天输入区（工具栏、表情面板等）各元素之间的间距。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="字号"
        tip="全局字号档位：标准 1.0 / 大 1.125 / 特大 1.25 倍"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': fontSizeScale === 1 }"
          @click="setFontSize('normal')"
        >
          标准
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': fontSizeScale === 1.125 }"
          @click="setFontSize('large')"
        >
          大
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': fontSizeScale === 1.25 }"
          @click="setFontSize('xlarge')"
        >
          特大
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="密度"
        tip="列表项与容器的高度、内边距、间距档位：紧凑 / 标准 / 宽松"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': density === 'compact' }"
          @click="setDensity('compact')"
        >
          紧凑
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': density === 'normal' }"
          @click="setDensity('normal')"
        >
          标准
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': density === 'comfortable' }"
          @click="setDensity('comfortable')"
        >
          宽松
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="动画开关"
        tip="全局动效总开关，关闭后悬停、弹层、波纹等动画全部停用"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': animationEnabled }"
          @click="setAnimationEnabled(true)"
        >
          开启
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': !animationEnabled }"
          @click="setAnimationEnabled(false)"
        >
          关闭
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="动画强度"
        tip="动效幅度档位：轻柔 / 标准 / 生动"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': animationLevel === 'subtle' }"
          @click="setAnimationLevel('subtle')"
        >
          轻柔
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': animationLevel === 'normal' }"
          @click="setAnimationLevel('normal')"
        >
          标准
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': animationLevel === 'expressive' }"
          @click="setAnimationLevel('expressive')"
        >
          生动
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="波纹效果"
        tip="按钮 / 列表项点击时的波纹扩散效果"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': animationRipple }"
          @click="setAnimationRipple(true)"
        >
          开启
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': !animationRipple }"
          @click="setAnimationRipple(false)"
        >
          关闭
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="Input 组件风格"
        tip="EmInput 的五种内置样式，下方输入框实时预览效果"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': inputVariant === 'default' }"
          @click="inputVariant = 'default'"
        >
          default
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': inputVariant === 'search' }"
          @click="inputVariant = 'search'"
        >
          search
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': inputVariant === 'filled' }"
          @click="inputVariant = 'filled'"
        >
          filled
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': inputVariant === 'ghost' }"
          @click="inputVariant = 'ghost'"
        >
          ghost
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': inputVariant === 'underline' }"
          @click="inputVariant = 'underline'"
        >
          underline
        </button>
      </div>
      <div class="demo-info">
        风格说明：default 默认 / search 搜索 / filled 填充 / ghost 幽灵 / underline 下划线。
      </div>
      <div style="margin-top: 8px;">
        <EmInput
          v-model="inputDemoValue"
          :variant="inputVariant"
          prefix-icon="misc/magnifier2"
          placeholder="预览 Input 风格..."
        />
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="颜色微调（气泡 / 输入区 / 聊天背景）"
        tip="覆盖语义色 token：对方 / 自己气泡底色、输入区背景、聊天区背景（支持颜色、渐变或图片 url），随时可恢复默认"
      />
      <div class="demo-settings__row">
        <span class="demo-settings__row-label">对方气泡</span>
        <input
          type="color"
          :value="bubbleBgOther || '#f3f4f6'"
          class="demo-color-input"
          @input="(e: Event) => setBubbleBg((e.target as HTMLInputElement).value, undefined)"
        >
        <button class="demo-reset-btn" @click="setBubbleBg(null, null)">
          恢复
        </button>
      </div>
      <div class="demo-settings__row">
        <span class="demo-settings__row-label">自己气泡</span>
        <input
          type="color"
          :value="bubbleBgSelf || '#3bb1ff'"
          class="demo-color-input"
          @input="(e: Event) => setBubbleBg(undefined, (e.target as HTMLInputElement).value)"
        >
        <button class="demo-reset-btn" @click="setBubbleBg(null, null)">
          恢复
        </button>
      </div>
      <div class="demo-settings__row">
        <span class="demo-settings__row-label">输入区背景</span>
        <input
          type="color"
          :value="inputBg || '#ffffff'"
          class="demo-color-input"
          @input="(e: Event) => setInputBg((e.target as HTMLInputElement).value)"
        >
        <button class="demo-reset-btn" @click="setInputBg(undefined)">
          恢复
        </button>
      </div>
      <div class="demo-settings__row demo-settings__row--column">
        <span class="demo-settings__row-label">聊天背景</span>
        <input
          :value="chatBg || ''"
          type="text"
          placeholder="颜色、渐变或 url(...)"
          class="demo-text-input"
          @input="(e: Event) => setChatBg((e.target as HTMLInputElement).value || undefined)"
        >
        <div class="demo-settings__row-actions">
          <button class="demo-reset-btn" @click="setChatBg(undefined)">
            恢复
          </button>
        </div>
      </div>
      <div class="demo-settings__row">
        <button class="demo-option" @click="setBubbleBg(null, null); setChatBg(undefined); setInputBg(undefined)">
          全部重置
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="键盘操作"
        tip="UIKIT 全局键盘操作总开关：Esc 关闭弹层、方向键切换导航等。关闭后所有快捷键立即失效（含下方演示）"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': keyboardShortcutsEnabled }"
          @click="toggleKeyboardShortcuts(true)"
        >
          开启
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': !keyboardShortcutsEnabled }"
          @click="toggleKeyboardShortcuts(false)"
        >
          关闭
        </button>
      </div>
      <div class="demo-info">
        控制 UIKIT 全部键盘操作：Esc 关闭弹层、方向键切换导航项等。关闭后所有快捷键立即失效（含下方演示）。<br>
        会话列表：鼠标悬停列表区域后可用 ↑ / ↓ 直接切换会话，Esc 退出键盘导航。
      </div>
      <div
        ref="navBoxRef"
        class="demo-keynav"
        :class="{ 'demo-keynav--active': navActive }"
        tabindex="0"
        @focus="navActive = true"
        @blur="navActive = false"
      >
        <div class="demo-keynav__tip">
          {{ navTip }}
        </div>
        <div class="demo-keynav__list">
          <EmCell
            v-for="(item, i) in cellTypes"
            :key="item.key"
            :title="item.label"
            :size="item.size"
            :disabled="item.state === 'disabled'"
            :active="i === activeIndex && item.state !== 'disabled'"
            border
            @click="setIndex(i)"
          />
        </div>
        <div class="demo-keynav__current">
          当前：{{ currentCell.label }}（{{ activeIndex + 1 }} / {{ cellTypes.length }}）
        </div>
      </div>

      <EmPopup v-model:show="showPreview" :close-on-esc="true">
        <div class="demo-cell-preview">
          <div class="demo-cell-preview__title">
            {{ currentCell.label }} 预览
          </div>
          <EmCell
            :title="currentCell.label"
            :size="currentCell.size"
            :disabled="currentCell.state === 'disabled'"
            :active="currentCell.state === 'active'"
            border
          />
          <button class="demo-btn" @click="showPreview = false">
            关闭（Esc）
          </button>
        </div>
      </EmPopup>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="语言"
        tip="界面语言：中文 / English，影响 UIKIT 内置文案（列表项、按钮、弹层等）"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': locale === 'zh-CN' }"
          @click="setLocale('zh-CN')"
        >
          中文
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': locale === 'en' }"
          @click="setLocale('en')"
        >
          English
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-keynav {
  margin-top: 8px;
  padding: 8px;
  border: 1px dashed var(--uikit-border-color, #e5e7eb);
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.demo-keynav--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  border-style: solid;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.demo-keynav__tip {
  font-size: 12px;
  color: var(--uikit-text-tertiary, #9ca3af);
  margin-bottom: 8px;
}

.demo-keynav__list {
  overflow: hidden;
  border-radius: 8px;
  background: var(--uikit-bg-base, #ffffff);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
}

.demo-keynav__current {
  margin-top: 8px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

.demo-cell-preview {
  width: 300px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-cell-preview__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}
</style>
