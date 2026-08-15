<script setup lang="ts">
import { ref } from 'vue'
import { EmIcon, useClient } from '@easemob/uikit-im'
import { demoPresetUsers } from './composables/use-demo-settings'
import type { DemoPresetUser } from './composables/use-demo-settings'

const emit = defineEmits<{
  (e: 'login-success'): void
}>()

const { init, login } = useClient()

// 从 localStorage 恢复历史配置
const savedConfig = (() => {
  try {
    const raw = localStorage.getItem('uikit_demo_login_config')
    return raw ? JSON.parse(raw) : null
  }
  catch {
    return null
  }
})()

const sdkAppKey = ref(savedConfig?.appKey || 'easemob-demo#support-ngi')
const sdkApiUrl = ref(savedConfig?.apiUrl || '')
const sdkDebug = ref(savedConfig?.debug || false)
const loginUser = ref(savedConfig?.user || '')
const loginPassword = ref(savedConfig?.password || '')
const loginToken = ref(savedConfig?.token || '')
const loginMode = ref<'password' | 'token'>(savedConfig?.mode || 'password')

/** 密码可见性（默认隐藏） */
const showPassword = ref(false)

const loading = ref(false)
const errorMsg = ref('')

/** 应用预设账号：切到 Token 模式并填入用户 / Token */
function applyPreset(preset: DemoPresetUser) {
  loginUser.value = preset.user
  loginToken.value = preset.token
  loginMode.value = 'token'
  errorMsg.value = ''
}

async function handleLogin() {
  errorMsg.value = ''
  if (!sdkAppKey.value) {
    errorMsg.value = '请输入 AppKey'
    return
  }
  if (!loginUser.value) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (loginMode.value === 'password' && !loginPassword.value) {
    errorMsg.value = '请输入密码'
    return
  }
  if (loginMode.value === 'token' && !loginToken.value) {
    errorMsg.value = '请输入 AccessToken'
    return
  }

  loading.value = true
  try {
    // 初始化 SDK
    init({
      appKey: sdkAppKey.value,
      ...(sdkApiUrl.value ? { apiUrl: sdkApiUrl.value } : {}),
      debug: sdkDebug.value,
    })

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

    // 登录成功：保存配置到 localStorage
    const configToSave = {
      appKey: sdkAppKey.value,
      apiUrl: sdkApiUrl.value,
      debug: sdkDebug.value,
      user: loginUser.value,
      mode: loginMode.value,
      // 密码和 token 按需保存（token 模式保存 token，密码模式保存密码方便调试）
      ...(loginMode.value === 'token'
        ? { token: loginToken.value }
        : { password: loginPassword.value }),
    }
    localStorage.setItem('uikit_demo_login_config', JSON.stringify(configToSave))

    emit('login-success')
  }
  catch (err) {
    errorMsg.value = `登录失败: ${(err as Error).message}`
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">
        UIKit Demo 登录
      </h1>

      <div class="login-form">
        <!-- AppKey -->
        <div class="login-field">
          <label class="login-label">AppKey</label>
          <input
            v-model="sdkAppKey"
            placeholder="例如: easemob-demo#support-ngi"
            class="demo-input"
          >
        </div>

        <!-- ApiUrl -->
        <div class="login-field">
          <label class="login-label">ApiUrl (可选)</label>
          <input
            v-model="sdkApiUrl"
            placeholder="默认不填"
            class="demo-input"
          >
        </div>

        <!-- Debug -->
        <div class="login-field login-field--inline">
          <label class="demo-check">
            <input v-model="sdkDebug" type="checkbox">
            <span>开启 Debug</span>
          </label>
        </div>

        <!-- 预设账号 -->
        <div class="login-field">
          <label class="login-label">快捷账号</label>
          <div class="login-preset-list">
            <button
              v-for="preset in demoPresetUsers"
              :key="preset.user"
              type="button"
              class="demo-btn"
              :class="{ 'demo-btn--active': loginUser === preset.user }"
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- 用户名 -->
        <div class="login-field">
          <label class="login-label">用户名</label>
          <input
            v-model="loginUser"
            placeholder="请输入用户名"
            class="demo-input"
            @keydown.enter="handleLogin"
          >
        </div>

        <!-- 密码 / Token -->
        <div class="login-field">
          <label class="login-label">
            <span>凭证</span>
            <div class="login-mode-switch">
              <button
                class="demo-btn demo-btn--small"
                :class="{ 'demo-btn--active': loginMode === 'password' }"
                @click="loginMode = 'password'"
              >
                密码
              </button>
              <button
                class="demo-btn demo-btn--small"
                :class="{ 'demo-btn--active': loginMode === 'token' }"
                @click="loginMode = 'token'"
              >
                Token
              </button>
            </div>
          </label>
          <div class="demo-input-wrap" v-if="loginMode === 'password'">
            <input
              v-model="loginPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              class="demo-input"
              @keydown.enter="handleLogin"
            >
            <button
              type="button"
              class="demo-input__eye"
              :title="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <EmIcon :name="showPassword ? 'actions/eye_off' : 'actions/eye'" :size="18" />
            </button>
          </div>
          <input
            v-else
            v-model="loginToken"
            placeholder="请输入 AccessToken"
            class="demo-input"
            @keydown.enter="handleLogin"
          >
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="login-error">
          {{ errorMsg }}
        </div>

        <!-- 登录按钮 -->
        <button
          class="demo-btn demo-btn--primary login-submit"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: var(--uikit-bg-base, #ffffff);
}

.login-card {
  width: 380px;
  max-width: calc(100vw - 32px);
  padding: 32px;
  border-radius: 12px;
  background-color: var(--uikit-bg-base, #ffffff);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
}

.login-title {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  color: var(--uikit-text-primary, #111827);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-field--inline {
  flex-direction: row;
  align-items: center;
}

.login-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  color: var(--uikit-text-secondary, #6b7280);
}

.login-mode-switch {
  display: flex;
  gap: 4px;
}

.login-preset-list {
  display: flex;
  gap: 8px;
}

.login-error {
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #fef2f2;
  color: #ef4444;
  font-size: 13px;
}

.login-submit {
  height: 40px;
  margin-top: 8px;
  font-size: 15px;
  font-weight: 500;
}

.demo-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  background-color: var(--uikit-bg-base, #ffffff);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.demo-input:focus {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.demo-input-wrap {
  position: relative;
}

.demo-input-wrap .demo-input {
  padding-right: 40px;
}

.demo-input__eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--uikit-text-secondary, #6b7280);
  cursor: pointer;
}

.demo-input__eye:hover {
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
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

.demo-btn--small {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}

.demo-btn--primary {
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: #ffffff;
  border: none;
}

.demo-btn--primary:hover {
  opacity: 0.9;
}

.demo-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
}
</style>
