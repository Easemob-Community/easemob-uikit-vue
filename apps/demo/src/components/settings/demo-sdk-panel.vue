<script setup lang="ts">
/**
 * 设置面板 - SDK 登录
 *
 * 包含：SDK 初始化（appKey / apiUrl / debug）、登录登出（密码 / Token 两种模式）、
 * 连接状态展示与 sdkClient 信息。
 * 说明：SDK 实例与登录态来自 useClient；登出成功后 emit('logout') 由
 * demo-page → app.vue 处理，清空本地登录缓存并回到登录页。
 */
import { useClient } from '@easemob/uikit-im'
import { demoPresetUsers, useDemoSettings } from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const emit = defineEmits<{
  (e: 'logout'): void
}>()

const { client, connected, isLoggedIn, currentUser, sdkClient, init, login, logout } = useClient()
const { sdkAppKey, sdkApiUrl, sdkDebug, loginUser, loginPassword, loginToken, loginMode, applyPresetUser } = useDemoSettings()

function handleInit() {
  init({
    appKey: sdkAppKey.value,
    ...(sdkApiUrl.value ? { apiUrl: sdkApiUrl.value } : {}),
    debug: sdkDebug.value,
  })
}

async function handleLogin() {
  if (!loginUser.value) {
    return
  }
  try {
    const params: { user: string, accessToken?: string, password?: string } = {
      user: loginUser.value,
    }
    if (loginMode.value === 'token' && loginToken.value) {
      params.accessToken = loginToken.value
    }
    else if (loginMode.value === 'password' && loginPassword.value) {
      params.password = loginPassword.value
    }
    await login(params)
  }
  catch (err) {
    console.warn('登录失败:', (err as Error).message)
  }
}

async function handleLogout() {
  try {
    await logout?.()
  }
  catch (err) {
    console.warn('登出失败:', (err as Error).message)
  }
  finally {
    emit('logout')
  }
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="SDK 初始化（延迟初始化验证）"
        tip="填写 appKey（可加 apiUrl）后手动初始化 SDK，验证延迟初始化场景"
      />
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <input
          v-model="sdkAppKey"
          placeholder="appKey"
          class="demo-input"
          style="width: 160px;"
        >
        <input
          v-model="sdkApiUrl"
          placeholder="apiUrl (可选)"
          class="demo-input"
          style="width: 160px;"
        >
        <label class="demo-check">
          <input v-model="sdkDebug" type="checkbox">
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
        <DemoSettingLabel
          title="SDK 登录"
          tip="SDK 连接与登录状态；支持快捷账号一键填入、密码 / Token 两种登录方式"
        />
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
        <span class="demo-settings__label">快捷账号</span>
        <button
          v-for="preset in demoPresetUsers"
          :key="preset.user"
          class="demo-btn"
          :class="{ 'demo-btn--active': loginUser === preset.user }"
          @click="applyPresetUser(preset)"
        >
          {{ preset.label }}
        </button>
        <span class="demo-settings__label" style="margin-left: 4px;">|</span>
        <input
          v-model="loginUser"
          placeholder="用户名"
          class="demo-input"
          style="width: 120px;"
        >
        <template v-if="loginMode === 'password'">
          <input
            v-model="loginPassword"
            placeholder="密码"
            type="password"
            class="demo-input"
            style="width: 120px;"
          >
        </template>
        <template v-else>
          <input
            v-model="loginToken"
            placeholder="accessToken"
            class="demo-input"
            style="width: 140px;"
          >
        </template>
        <button
          class="demo-btn"
          :class="{ 'demo-btn--active': loginMode === 'password' }"
          @click="loginMode = 'password'"
        >
          密码
        </button>
        <button
          class="demo-btn"
          :class="{ 'demo-btn--active': loginMode === 'token' }"
          @click="loginMode = 'token'"
        >
          Token
        </button>
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
      <div v-if="sdkClient" class="demo-info">
        sdkClient 实例: {{ sdkClient.constructor.name }}
      </div>
    </div>
  </div>
</template>
