<script setup lang="ts">
import { ref } from 'vue'
import {
  ConversationContainer,
  ChatContainer,
  Popup,
  useTheme,
  useLocale,
  useUIKit,
  useClient,
} from '@easemob/uikit'

const { mode, primaryColor, isDark, setMode, setPrimaryColor } = useTheme()
const { locale, setLocale } = useLocale()
const { theme: themeStore } = useUIKit()
const { client, connected, isLoggedIn, currentUser, connection, init, login, logout } = useClient()

const showSettings = ref(false)

// SDK 初始化相关状态
const sdkAppKey = ref('')
const sdkApiUrl = ref('')
const sdkDebug = ref(false)
const loginUser = ref('')
const loginToken = ref('')

function handleInit() {
  init({
    appKey: sdkAppKey.value,
    ...(sdkApiUrl.value ? { apiUrl: sdkApiUrl.value } : {}),
    debug: sdkDebug.value,
  })
}

async function handleLogin() {
  if (!loginUser.value) return
  try {
    await login({ user: loginUser.value, accessToken: loginToken.value || undefined })
  } catch (err) {
    alert('登录失败: ' + (err as Error).message)
  }
}

async function handleLogout() {
  try {
    await logout?.()
  } catch (err) {
    alert('登出失败: ' + (err as Error).message)
  }
}

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

    <!-- 设置抽屉 -->
    <Popup v-model:show="showSettings" position="right">
      <div class="demo-drawer">
        <div class="demo-drawer__header">
          <span class="demo-drawer__title">设置</span>
          <button class="demo-btn demo-btn--icon" @click="showSettings = false">✕</button>
        </div>
        <div class="demo-drawer__body">
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

          <div class="demo-settings__group">
            <label class="demo-settings__label">SDK 初始化（延迟初始化验证）</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <input
                v-model="sdkAppKey"
                placeholder="appKey"
                class="demo-input"
                style="width: 160px;"
              />
              <input
                v-model="sdkApiUrl"
                placeholder="apiUrl (可选)"
                class="demo-input"
                style="width: 160px;"
              />
              <label class="demo-check">
                <input v-model="sdkDebug" type="checkbox" />
                <span>debug</span>
              </label>
              <button
                class="demo-btn"
                :disabled="!sdkAppKey || !!client"
                @click="handleInit"
              >
                {{ client ? '已初始化' : '初始化 SDK' }}
              </button>
            </div>
          </div>

          <div v-if="client" class="demo-settings__group">
            <label class="demo-settings__label">
              SDK 登录
              <span
                class="demo-status-dot"
                :class="connected ? 'demo-status-dot--on' : 'demo-status-dot--off'"
              />
              <span class="demo-status-text">
                {{ connected ? '已连接' : '未连接' }} |
                {{ isLoggedIn ? '已登录' : '未登录' }}
                <template v-if="currentUser">| 用户: {{ currentUser }}</template>
              </span>
            </label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <input
                v-model="loginUser"
                placeholder="user"
                class="demo-input"
                style="width: 100px;"
              />
              <input
                v-model="loginToken"
                placeholder="accessToken (可选)"
                class="demo-input"
                style="width: 140px;"
              />
              <button
                class="demo-btn"
                :disabled="!loginUser || isLoggedIn"
                @click="handleLogin"
              >
                登录
              </button>
              <button
                class="demo-btn"
                :disabled="!isLoggedIn"
                @click="handleLogout"
              >
                登出
              </button>
            </div>
            <div v-if="connection" class="demo-info">
              connection 实例: {{ connection.constructor.name }}
            </div>
          </div>
        </div>
      </div>
    </Popup>

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

.demo-drawer {
  width: 380px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base, #ffffff);
}

.demo-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  flex-shrink: 0;
}

.demo-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.demo-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.demo-input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  background-color: var(--uikit-bg-base, #ffffff);
  color: var(--uikit-text-primary, #111827);
  font-size: 13px;
  outline: none;
}

.demo-input:focus {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
}

.demo-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 8px;
  background-color: #ef4444;
}

.demo-status-dot--on {
  background-color: #22c55e;
}

.demo-status-text {
  margin-left: 6px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

.demo-info {
  margin-top: 6px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
