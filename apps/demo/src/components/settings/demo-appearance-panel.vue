<script setup lang="ts">
/**
 * 特性开关 - 外观面板
 *
 * 按图片一比一布局，包含：
 * - 主题与颜色：主题模式、主题色取色器（2D 饱和度×亮度面板 + 色相条 + 明度条 + Hex/RGB/HSL/HSB 标签页）。
 * - 颜色微调：对方气泡、自己气泡、输入区背景、聊天背景。
 * - 组件风格：Hover 风格、气泡形状、容器间距、字号、密度、动画开关、动画强度、Input 组件风格。
 * - 一键重置。
 *
 * 说明：UIKIT 主题色支持「色相 0-360 + 饱和度 0-100 + 亮度 0-100」，2D 色板映射饱和度×亮度，
 * 色相条与明度条分别控制 H/L；颜色模式标签页为快捷格式切换（Hex/RGB/HSL/HSB 同色不同表达）。
 */
import { computed, ref } from 'vue'
import {
  EmInput,
  useLocale,
  useTheme,
  useUIKit,
} from '@easemob/uikit-im'
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const {
  mode,
  primaryColor,
  primaryColorSat,
  primaryColorLum,
  hoverStyle,
  containerGap,
  fontSizeScale,
  density,
  headerBorder,
  messageChipBg,
  bubbleBgOther,
  bubbleBgSelf,
  chatBg,
  inputBg,
  hoverColor,
  activeColor,
  animationEnabled,
  animationLevel,
  setMode,
  setPrimaryColor,
  setPrimaryColorSat,
  setPrimaryColorLum,
  setHoverStyle,
  setContainerGap,
  setFontSize,
  setDensity,
  setHeaderBorder,
  setMessageChipBg,
  setAnimationEnabled,
  setAnimationLevel,
  setBubbleBg,
  setChatBg,
  setInputBg,
  setHoverColor,
  setActiveColor,
} = useTheme()
const { theme: themeStore } = useUIKit()
const { locale, setLocale } = useLocale()
const { inputVariant, inputDemoValue } = useDemoSettings()

/* ===== 主题色 2D 面板（饱和度×亮度，hue 由色相条控制） ===== */
const colorPanelRef = ref<HTMLElement>()
const isDraggingPanel = ref(false)

function panelColorFromEvent(e: MouseEvent | TouchEvent): { s: number; l: number } {
  const panel = colorPanelRef.value
  if (!panel) return { s: primaryColorSat.value, l: primaryColorLum.value }
  const rect = panel.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height)
  return {
    s: Math.round((x / rect.width) * 100),
    l: Math.round((1 - y / rect.height) * 100),
  }
}

function applyPanelColor(e: MouseEvent | TouchEvent) {
  const { s, l } = panelColorFromEvent(e)
  setPrimaryColor({ h: Math.round(primaryColor.value), s, l })
}

function onPanelMouseDown(e: MouseEvent) {
  isDraggingPanel.value = true
  applyPanelColor(e)
}
function onPanelTouchStart(e: TouchEvent) {
  isDraggingPanel.value = true
  applyPanelColor(e)
}
function onPanelMouseMove(e: MouseEvent) {
  if (!isDraggingPanel.value) return
  applyPanelColor(e)
}
function onPanelTouchMove(e: TouchEvent) {
  if (!isDraggingPanel.value) return
  applyPanelColor(e)
}
function stopDraggingPanel() {
  isDraggingPanel.value = false
}

/* ===== 色相条 ===== */
const hueSliderRef = ref<HTMLElement>()
const isDraggingHue = ref(false)

function hueFromEvent(e: MouseEvent | TouchEvent): number {
  const bar = hueSliderRef.value
  if (!bar) return primaryColor.value
  const rect = bar.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
  return Math.round((x / rect.width) * 360)
}

function onHueMouseDown(e: MouseEvent) {
  isDraggingHue.value = true
  setPrimaryColor(hueFromEvent(e))
}
function onHueTouchStart(e: TouchEvent) {
  isDraggingHue.value = true
  setPrimaryColor(hueFromEvent(e))
}
function onHueMouseMove(e: MouseEvent) {
  if (!isDraggingHue.value) return
  setPrimaryColor(hueFromEvent(e))
}
function onHueTouchMove(e: TouchEvent) {
  if (!isDraggingHue.value) return
  setPrimaryColor(hueFromEvent(e))
}
function stopDraggingHue() {
  isDraggingHue.value = false
}

/* ===== 颜色模式标签页（快捷展示当前色，HSL 为编辑态） ===== */
type ColorMode = 'hex' | 'rgb' | 'hsl' | 'hsb'
const activeColorMode = ref<ColorMode>('hsl')
const colorModes: { key: ColorMode; label: string }[] = [
  { key: 'hex', label: 'Hex' },
  { key: 'rgb', label: 'RGB' },
  { key: 'hsl', label: 'HSL' },
  { key: 'hsb', label: 'HSB' },
]

const hslPreview = computed(() => ({
  h: Math.round(primaryColor.value),
  s: Math.round(primaryColorSat.value),
  l: Math.round(primaryColorLum.value),
}))

/* ===== 明度条（控制 L） ===== */
const lightnessSliderRef = ref<HTMLElement>()
const isDraggingLightness = ref(false)

function lightnessFromEvent(e: MouseEvent | TouchEvent): number {
  const bar = lightnessSliderRef.value
  if (!bar) return primaryColorLum.value
  const rect = bar.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
  return Math.round((x / rect.width) * 100)
}
function onLightnessMouseDown(e: MouseEvent) {
  isDraggingLightness.value = true
  setPrimaryColorLum(lightnessFromEvent(e))
}
function onLightnessTouchStart(e: TouchEvent) {
  isDraggingLightness.value = true
  setPrimaryColorLum(lightnessFromEvent(e))
}
function onLightnessMouseMove(e: MouseEvent) {
  if (!isDraggingLightness.value) return
  setPrimaryColorLum(lightnessFromEvent(e))
}
function onLightnessTouchMove(e: TouchEvent) {
  if (!isDraggingLightness.value) return
  setPrimaryColorLum(lightnessFromEvent(e))
}
function stopDraggingLightness() {
  isDraggingLightness.value = false
}

/* ===== 一键重置 ===== */
function resetAll() {
  setMode('auto')
  setPrimaryColor({ h: 203, s: 100, l: 60 })
  themeStore.setBubbleShape('ground')
  setHoverStyle('default')
  setContainerGap(8)
  setFontSize('normal')
  setDensity('normal')
  setHeaderBorder(false)
  setMessageChipBg(true)
  setAnimationEnabled(true)
  setAnimationLevel('normal')
  setBubbleBg(null, null)
  setChatBg(undefined)
  setInputBg(undefined)
  setHoverColor(undefined)
  setActiveColor(undefined)
  inputVariant.value = 'search'
  setLocale('zh-CN')
}

/* ===== 辅助：当前主题色预览 ===== */
const currentColorStyle = computed(() => ({
  backgroundColor: `hsl(${primaryColor.value}, ${primaryColorSat.value}%, ${primaryColorLum.value}%)`,
}))
</script>

<template>
  <div class="demo-panel">
    <!-- ===== 主题与颜色 ===== -->
    <section class="demo-section">
      <h3 class="demo-section__title">主题与颜色</h3>

      <div class="demo-row">
        <div class="demo-row__left">
          <span class="demo-row__label">切换主题</span>
        </div>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': mode === 'light' }"
              @click="setMode('light')"
            >
              亮色
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': mode === 'dark' }"
              @click="setMode('dark')"
            >
              暗色
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': mode === 'auto' }"
              @click="setMode('auto')"
            >
              跟随系统
            </button>
          </div>
        </div>
      </div>
      <p class="demo-row__desc">全局明暗主题：亮色 / 暗色 / 跟随系统主题色</p>

      <div class="demo-row demo-row--column">
        <span class="demo-row__label">主题色色相</span>
        <p class="demo-row__desc">调整 UIKIT 主题色，影响按钮、选中态、链接等主色元素</p>

        <!-- 2D 色板（饱和度×亮度） -->
        <div
          ref="colorPanelRef"
          class="demo-color-panel"
          :style="{ '--panel-hue': primaryColor }"
          @mousedown="onPanelMouseDown"
          @mousemove="onPanelMouseMove"
          @mouseup="stopDraggingPanel"
          @mouseleave="stopDraggingPanel"
          @touchstart.prevent="onPanelTouchStart"
          @touchmove.prevent="onPanelTouchMove"
          @touchend="stopDraggingPanel"
        >
          <div
            class="demo-color-panel__cursor"
            :style="{ left: `${primaryColorSat}%`, top: `${100 - primaryColorLum}%` }"
          />
        </div>

        <!-- 色相条 + 预览 -->
        <div class="demo-hue-row">
          <div class="demo-color-dot" :style="currentColorStyle" />
          <div
            ref="hueSliderRef"
            class="demo-hue-slider"
            @mousedown="onHueMouseDown"
            @mousemove="onHueMouseMove"
            @mouseup="stopDraggingHue"
            @mouseleave="stopDraggingHue"
            @touchstart.prevent="onHueTouchStart"
            @touchmove.prevent="onHueTouchMove"
            @touchend="stopDraggingHue"
          >
            <div class="demo-hue-slider__thumb" :style="{ left: `${(primaryColor / 360) * 100}%` }" />
          </div>
        </div>

        <!-- 亮度条（控制 L） -->
        <div class="demo-hue-row">
          <div class="demo-color-dot" :style="currentColorStyle" />
          <div
            ref="lightnessSliderRef"
            class="demo-lightness-slider"
            :style="{ '--panel-hue': primaryColor }"
            @mousedown="onLightnessMouseDown"
            @mousemove="onLightnessMouseMove"
            @mouseup="stopDraggingLightness"
            @mouseleave="stopDraggingLightness"
            @touchstart.prevent="onLightnessTouchStart"
            @touchmove.prevent="onLightnessTouchMove"
            @touchend="stopDraggingLightness"
          >
            <div class="demo-lightness-slider__thumb" :style="{ left: `${primaryColorLum}%` }" />
          </div>
        </div>

        <!-- 颜色模式标签页 -->
        <div class="demo-color-modes">
          <button
            v-for="m in colorModes"
            :key="m.key"
            class="demo-color-modes__item"
            :class="{ 'demo-color-modes__item--active': activeColorMode === m.key }"
            @click="activeColorMode = m.key"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- H / S / L 数值 -->
        <div class="demo-color-values">
          <div class="demo-color-value">
            <span class="demo-color-value__prefix">H</span>
            <input
              type="number"
              min="0"
              max="360"
              :value="hslPreview.h"
              class="demo-color-value__input"
              @input="(e: Event) => setPrimaryColor(Number((e.target as HTMLInputElement).value))"
            >
          </div>
          <div class="demo-color-value">
            <span class="demo-color-value__prefix">S</span>
            <input
              type="number"
              min="0"
              max="100"
              :value="hslPreview.s"
              class="demo-color-value__input"
              @input="(e: Event) => setPrimaryColorSat(Number((e.target as HTMLInputElement).value))"
            >
          </div>
          <div class="demo-color-value">
            <span class="demo-color-value__prefix">L</span>
            <input
              type="number"
              min="0"
              max="100"
              :value="hslPreview.l"
              class="demo-color-value__input"
              @input="(e: Event) => setPrimaryColorLum(Number((e.target as HTMLInputElement).value))"
            >
          </div>
          <div class="demo-color-value demo-color-value--percent demo-color-value--disabled">
            <span class="demo-color-value__static">{{ hslPreview.l }}</span>
            <span class="demo-color-value__unit">%</span>
          </div>
        </div>

        <p class="demo-row__desc">
          * 2D 色板调整饱和度/亮度，色相条与亮度条分别调整 H/L；颜色模式标签页为格式切换。
        </p>
      </div>
    </section>

    <!-- ===== 颜色微调 ===== -->
    <section class="demo-section">
      <h3 class="demo-section__title">颜色微调（气泡 / 输入区 / 聊天背景）</h3>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">对方气泡</span>
        <div class="demo-row__right">
          <input
            type="color"
            :value="bubbleBgOther || '#f3f4f6'"
            class="demo-color-input"
            @input="(e: Event) => setBubbleBg((e.target as HTMLInputElement).value, undefined)"
          >
          <button class="demo-text-btn" @click="setBubbleBg(null, undefined)">恢复</button>
        </div>
      </div>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">自己气泡</span>
        <div class="demo-row__right">
          <input
            type="color"
            :value="bubbleBgSelf || '#3bb1ff'"
            class="demo-color-input"
            @input="(e: Event) => setBubbleBg(undefined, (e.target as HTMLInputElement).value)"
          >
          <button class="demo-text-btn" @click="setBubbleBg(undefined, null)">恢复</button>
        </div>
      </div>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">输入区背景</span>
        <div class="demo-row__right">
          <input
            type="color"
            :value="inputBg || '#ffffff'"
            class="demo-color-input"
            @input="(e: Event) => setInputBg((e.target as HTMLInputElement).value)"
          >
          <button class="demo-text-btn" @click="setInputBg(undefined)">恢复</button>
        </div>
      </div>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">Hover 背景色</span>
        <div class="demo-row__right">
          <input
            type="color"
            :value="hoverColor || '#e5e7eb'"
            class="demo-color-input"
            @input="(e: Event) => setHoverColor((e.target as HTMLInputElement).value)"
          >
          <button class="demo-text-btn" @click="setHoverColor(undefined)">恢复</button>
        </div>
      </div>
      <p class="demo-row__desc">列表项 / 菜单项的悬停背景色，自定义后浅色与深色模式同值。</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">选中背景色</span>
        <div class="demo-row__right">
          <input
            type="color"
            :value="activeColor || '#33b1ff'"
            class="demo-color-input"
            @input="(e: Event) => setActiveColor((e.target as HTMLInputElement).value)"
          >
          <button class="demo-text-btn" @click="setActiveColor(undefined)">恢复</button>
        </div>
      </div>
      <p class="demo-row__desc">会话列表等当前选中项的背景色；不自定义时跟随品牌主色（半透明）。</p>

      <div class="demo-row demo-row--column demo-row--bordered">
        <div class="demo-row__spread">
          <span class="demo-row__label">聊天背景</span>
          <button class="demo-text-btn" @click="setChatBg(undefined)">恢复</button>
        </div>
        <input
          :value="chatBg || ''"
          type="text"
          placeholder="颜色、渐变或 url(...)"
          class="demo-text-input"
          @input="(e: Event) => setChatBg((e.target as HTMLInputElement).value || undefined)"
        >
      </div>
    </section>

    <!-- ===== 组件风格 ===== -->
    <section class="demo-section">
      <h3 class="demo-section__title">组件风格</h3>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">Hover 风格</span>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': hoverStyle === 'default' }"
              @click="setHoverStyle('default')"
            >
              默认
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': hoverStyle === 'rounded' }"
              @click="setHoverStyle('rounded')"
            >
              圆角
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': hoverStyle === 'square' }"
              @click="setHoverStyle('square')"
            >
              直角
            </button>
          </div>
        </div>
      </div>
      <p class="demo-row__desc">列表项（会话 / 联系人等）的悬停样式：默认圆角整行高亮；圆角卡片带左右缩进；直角整行直角高亮。</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">气泡形状</span>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': themeStore.bubbleShape === 'ground' }"
              @click="themeStore.setBubbleShape('ground')"
            >
              大圆角
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': themeStore.bubbleShape === 'square' }"
              @click="themeStore.setBubbleShape('square')"
            >
              小圆角
            </button>
          </div>
        </div>
      </div>
      <p class="demo-row__desc">影响消息气泡的圆角大小：大圆角 16px（默认），小圆角 8px（接近直角但保留过渡）。</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">容器间距</span>
        <div class="demo-row__right">
          <input
            type="range"
            min="0"
            max="24"
            :value="containerGap"
            class="demo-range-input"
            @input="(e: Event) => setContainerGap(Number((e.target as HTMLInputElement).value))"
          >
          <span class="demo-range-value">{{ containerGap }}</span>
        </div>
      </div>
      <p class="demo-row__desc">调整聊天输入区（工具栏、表情面板等）各元素之间的间距。</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">字号</span>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': fontSizeScale === 1 }"
              @click="setFontSize('normal')"
            >
              标准
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': fontSizeScale === 1.125 }"
              @click="setFontSize('large')"
            >
              大
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': fontSizeScale === 1.25 }"
              @click="setFontSize('xlarge')"
            >
              特大
            </button>
          </div>
        </div>
      </div>
      <p class="demo-row__desc">全局字号档位：标准 1.0 / 大 1.125 / 特大 1.25 倍</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">密度</span>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': density === 'compact' }"
              @click="setDensity('compact')"
            >
              紧凑
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': density === 'normal' }"
              @click="setDensity('normal')"
            >
              标准
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': density === 'comfortable' }"
              @click="setDensity('comfortable')"
            >
              宽松
            </button>
          </div>
        </div>
      </div>
      <p class="demo-row__desc">列表项与容器的高度、内边距、间距档位：紧凑 / 标准 / 宽松</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">Header 分隔线</span>
        <div class="demo-row__right">
          <button
            class="demo-switch"
            :class="{ 'demo-switch--active': headerBorder }"
            @click="setHeaderBorder(!headerBorder)"
          >
            <span class="demo-switch__thumb" />
          </button>
        </div>
      </div>
      <p class="demo-row__desc">会话 / 通讯录 / 聊天 / 抽屉 / 弹窗 header 底部的 1px 分隔线，默认关闭</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">提示胶囊背景</span>
        <div class="demo-row__right">
          <button
            class="demo-switch"
            :class="{ 'demo-switch--active': messageChipBg }"
            @click="setMessageChipBg(!messageChipBg)"
          >
            <span class="demo-switch__thumb" />
          </button>
        </div>
      </div>
      <p class="demo-row__desc">时间分割线 / 通知事件 / 没有更多历史消息的气泡底胶囊，默认开启</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">动画开关</span>
        <div class="demo-row__right">
          <button
            class="demo-switch"
            :class="{ 'demo-switch--active': animationEnabled }"
            @click="setAnimationEnabled(!animationEnabled)"
          >
            <span class="demo-switch__thumb" />
          </button>
        </div>
      </div>
      <p class="demo-row__desc">全局动效总开关，关闭后悬停、弹层、波纹等动画全部停用</p>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">动画强度</span>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': animationLevel === 'subtle' }"
              @click="setAnimationLevel('subtle')"
            >
              轻柔
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': animationLevel === 'normal' }"
              @click="setAnimationLevel('normal')"
            >
              标准
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': animationLevel === 'expressive' }"
              @click="setAnimationLevel('expressive')"
            >
              生动
            </button>
          </div>
        </div>
      </div>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">Input 组件风格</span>
        <div class="demo-row__right">
          <select v-model="inputVariant" class="demo-select">
            <option value="default">default</option>
            <option value="search">search</option>
            <option value="filled">filled</option>
            <option value="ghost">ghost</option>
            <option value="underline">underline</option>
          </select>
        </div>
      </div>
      <p class="demo-row__desc">Input 的五种内置样式，下方输入框实时预览效果</p>
      <div class="demo-input-preview">
        <EmInput
          v-model="inputDemoValue"
          :variant="inputVariant"
          placeholder="Input"
        />
      </div>

      <div class="demo-row demo-row--bordered">
        <span class="demo-row__label">语言</span>
        <div class="demo-row__right">
          <div class="demo-segmented">
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': locale === 'zh-CN' }"
              @click="setLocale('zh-CN')"
            >
              中文
            </button>
            <button
              class="demo-segmented__item"
              :class="{ 'demo-segmented__item--active': locale === 'en' }"
              @click="setLocale('en')"
            >
              English
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 一键重置 ===== -->
    <button class="demo-reset-all" @click="resetAll">
      一键重置
    </button>
  </div>
</template>

<style scoped>
.demo-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-section__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--uikit-text-secondary, #6b7280);
}

.demo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 44px;
}

.demo-row--column {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.demo-row--bordered {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
}

.demo-row__left,
.demo-row__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-row__right {
  flex-shrink: 0;
}

.demo-row__spread {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.demo-row__label {
  font-size: 15px;
  font-weight: 500;
  color: var(--uikit-text-primary, #111827);
}

.demo-row__desc {
  margin: -6px 0 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.5;
}

/* 分段按钮 */
.demo-segmented {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
}

.demo-segmented__item {
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--uikit-text-primary, #111827);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.demo-segmented__item--active {
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 2D 色板 */
.demo-color-panel {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: 12px;
  background:
    linear-gradient(to bottom, transparent, #000),
    linear-gradient(to right, #fff, hsl(var(--panel-hue, 203), 100%, 50%));
  cursor: crosshair;
  overflow: hidden;
  touch-action: none;
}

.demo-color-panel__cursor {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 色相条 */
.demo-hue-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-hue-row--disabled {
  opacity: 0.6;
}

.demo-color-dot {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
}

.demo-color-dot--empty {
  background: linear-gradient(135deg, #e5e7eb 25%, transparent 25%, transparent 50%, #e5e7eb 50%, #e5e7eb 75%, transparent 75%);
  background-size: 10px 10px;
}

.demo-hue-slider,
.demo-lightness-slider {
  position: relative;
  flex: 1;
  height: 18px;
  border-radius: 9px;
  cursor: pointer;
  touch-action: none;
}

.demo-hue-slider {
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}

.demo-lightness-slider {
  background: linear-gradient(to right, #fff, hsl(var(--panel-hue, 203), 100%, 50%));
}

.demo-hue-slider__thumb,
.demo-lightness-slider__thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 28px;
  border: 2px solid #ffffff;
  border-radius: 7px;
  background-color: transparent;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 颜色模式标签页 */
.demo-color-modes {
  display: flex;
  padding: 3px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
}

.demo-color-modes__item {
  flex: 1;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--uikit-text-secondary, #6b7280);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-color-modes__item--active {
  background-color: #ffffff;
  color: var(--uikit-text-primary, #111827);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 颜色数值 */
.demo-color-values {
  display: flex;
  gap: 8px;
}

.demo-color-value {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
}

.demo-color-value--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-color-value--percent {
  flex: 0.6;
}

.demo-color-value__prefix,
.demo-color-value__unit,
.demo-color-value__static {
  font-size: 13px;
  color: var(--uikit-text-primary, #111827);
}

.demo-color-value__prefix {
  color: var(--uikit-text-secondary, #6b7280);
}

.demo-color-value__input {
  flex: 1;
  width: 0;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--uikit-text-primary, #111827);
  outline: none;
}

.demo-unsupported-tip {
  margin: 0;
  font-size: 11px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

/* 行内颜色选择 */
.demo-color-input {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.demo-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.demo-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 5px;
}

.demo-text-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--uikit-text-secondary, #6b7280);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s;
}

.demo-text-btn:hover {
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

/* 滑块 */
.demo-range-input {
  flex: 1;
  width: 120px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 3px;
  background: linear-gradient(to right, #e5e7eb, var(--uikit-primary-color, hsl(203, 100%, 60%)));
  outline: none;
}

.demo-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--uikit-primary-color, hsl(203, 100%, 60%));
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.demo-range-value {
  min-width: 24px;
  text-align: right;
  font-size: 14px;
  color: var(--uikit-text-secondary, #6b7280);
}

/* Toggle switch */
.demo-switch {
  position: relative;
  width: 44px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary, #e5e7eb);
  cursor: pointer;
  transition: background-color 0.2s;
}

.demo-switch--active {
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

.demo-switch--active .demo-switch__thumb {
  transform: translateX(20px);
}

/* 下拉选择 */
.demo-select {
  height: 32px;
  padding: 0 28px 0 12px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 8px;
  background-color: var(--uikit-bg-base, #ffffff);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
}

.demo-select:focus {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

/* Input 预览 */
.demo-input-preview {
  margin-top: 4px;
}

/* 一键重置 */
.demo-reset-all {
  width: 100%;
  height: 40px;
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.demo-reset-all:hover {
  background-color: var(--uikit-border-color, #e5e7eb);
}
</style>
