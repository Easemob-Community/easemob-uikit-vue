<script setup lang="ts">
/**
 * 设置面板 - 外观
 *
 * 包含：主题模式 / 主题色 / Hover 风格 / 头像·气泡·组件形状 / 容器间距 /
 * 动画开关·强度·波纹 / Input 组件风格实时预览 / 语言
 *
 * 说明：直接消费 useTheme / useUIKit(theme) / useLocale，改动即时作用于全局主题；
 * Input 风格与预览值来自 useDemoSettings（输入框演示属于聊天面板，风格演示留在外观）。
 */
import { EmInput, useLocale, useTheme, useUIKit } from '@easemob/uikit'
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const {
  mode, primaryColor, hoverStyle, containerGap, fontSizeScale,
  bubbleBgOther, bubbleBgSelf, chatBg, inputBg,
  animationEnabled, animationLevel, animationRipple,
  setMode, setPrimaryColor, setHoverStyle, setContainerGap, setFontSize,
  setAnimationEnabled, setAnimationLevel, setAnimationRipple,
  setBubbleBg, setChatBg, setInputBg,
} = useTheme()
const { theme: themeStore } = useUIKit()
const { locale, setLocale } = useLocale()
const { inputVariant, inputDemoValue } = useDemoSettings()

function updatePrimaryColor(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  setPrimaryColor(val)
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">主题模式</label>
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
      <label class="demo-settings__label">主题色</label>
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
      <label class="demo-settings__label">Hover 风格</label>
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
      <label class="demo-settings__label">头像形状</label>
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
          方形
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">气泡形状</label>
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.bubbleShape === 'ground' }"
          @click="themeStore.setBubbleShape('ground')"
        >
          圆角
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.bubbleShape === 'square' }"
          @click="themeStore.setBubbleShape('square')"
        >
          直角
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">组件形状</label>
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.componentsShape === 'ground' }"
          @click="themeStore.setComponentsShape('ground')"
        >
          圆角
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': themeStore.componentsShape === 'square' }"
          @click="themeStore.setComponentsShape('square')"
        >
          直角
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">容器间距</label>
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
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">字号</label>
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
      <label class="demo-settings__label">动画开关</label>
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
      <label class="demo-settings__label">动画强度</label>
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
      <label class="demo-settings__label">波纹效果</label>
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
      <label class="demo-settings__label">Input 组件风格</label>
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
      <label class="demo-settings__label">语义 token 调试</label>
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
      <label class="demo-settings__label">语言</label>
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
