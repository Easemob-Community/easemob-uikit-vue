<script setup lang="ts">
import { ref } from 'vue'
import {
  ConversationContainer,
  ChatContainer,
  useTheme,
  useLocale,
  useUIKit,
} from '@easemob/uikit'

const { mode, primaryColor, isDark, setMode, setPrimaryColor } = useTheme()
const { locale, setLocale } = useLocale()
const { theme: themeStore } = useUIKit()

const showSettings = ref(false)

function updatePrimaryColor(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  setPrimaryColor(val)
}
</script>

<template>
  <div class="demo-layout">
    <!-- 顶部工具栏 -->
    <header class="demo-toolbar">
      <div class="demo-toolbar__brand">
        <span class="demo-toolbar__logo">UIKit</span>
        <span class="demo-toolbar__tag">Demo</span>
      </div>
      <div class="demo-toolbar__actions">
        <button
          class="demo-btn demo-btn--icon"
          :title="isDark ? '切换亮色' : '切换暗色'"
          @click="setMode(isDark ? 'light' : 'dark')"
        >
          <span v-if="isDark">☀️</span>
          <span v-else>🌙</span>
        </button>
        <button
          class="demo-btn"
          :class="{ 'demo-btn--active': showSettings }"
          @click="showSettings = !showSettings"
        >
          设置
        </button>
      </div>
    </header>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="demo-settings">
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

    <!-- 主体内容 -->
    <div class="demo-layout__body">
      <div class="demo-layout__sidebar">
        <ConversationContainer />
      </div>
      <div class="demo-layout__main">
        <ChatContainer />
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--uikit-bg-base, #ffffff);
  color: var(--uikit-text-primary, #111827);
}

.demo-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  background-color: var(--uikit-bg-base, #ffffff);
  flex-shrink: 0;
}

.demo-toolbar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-toolbar__logo {
  font-size: 18px;
  font-weight: 700;
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-toolbar__tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-secondary, #6b7280);
}

.demo-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn:hover {
  opacity: 0.85;
}

.demo-btn--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-btn--icon {
  width: 32px;
  padding: 0;
}

.demo-settings {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  background-color: var(--uikit-bg-base, #ffffff);
  flex-shrink: 0;
}

.demo-settings__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-settings__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--uikit-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.demo-settings__options {
  display: flex;
  gap: 8px;
}

.demo-option {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  background-color: transparent;
  color: var(--uikit-text-primary, #111827);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-option:hover {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-option--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: #ffffff;
}

.demo-settings__color {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 3px;
  background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
  outline: none;
}

.demo-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--uikit-primary-color, hsl(203, 100%, 60%));
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.demo-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--uikit-primary-color, hsl(203, 100%, 60%));
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.demo-color-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--uikit-bg-secondary, #e5e7eb);
  flex-shrink: 0;
}

.demo-layout__body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.demo-layout__sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  overflow: auto;
}

.demo-layout__main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
