<script setup lang="ts">
/**
 * demo-chatroom 登录页：纯 core useClient（不依赖 IM 包）；
 * 登录配置与 apps/demo 共用 localStorage `uikit_demo_login_config`，
 * 在 IM Demo 登录过的用户进入本应用自动带出配置。
 */
import { ref } from 'vue'
import { useClient } from '@easemob/uikit-core'

const emit = defineEmits<{
  (e: 'login-success'): void
}>()

const { init, login } = useClient()

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
const loginUser = ref(savedConfig?.user || '')
const loginPassword = ref(savedConfig?.password || '')
const loginToken = ref(savedConfig?.token || '')
const loginMode = ref<'password' | 'token'>(savedConfig?.mode || 'password')

/** 预设账号（与 apps/demo 相同的联调账号） */
const presetUsers = [
  { label: 'hfp', user: 'hfp', token: 'YWMtt1uvsJFEEfGLvmUp95pHgyZVsAd-uUblpSk5yg-TZXCn3yKQOJ8R8ZT7kRZVZ2IzAwMAAAGf1Q9A-zeeSADeavDML9qKVDwwuZeVK-eWwyTBP3Q0xPpTFGHNjPYU_Q' },
  { label: 'pfh', user: 'pfh', token: 'YWMt2L0MEpFEEfGzYtkmnAOhAiZVsAd-uUblpSk5yg-TZXCAQPjQT0cR8Y8fKcyJ0N-CAwMAAAGf1RAbvjeeSABhTlXEQ9FIBlmX4W53N7YYv8MnL7GbUEMYJ1OD91tjtg' },
]

const loading = ref(false)
const errorMsg = ref('')

function applyPreset(preset: { label: string, user: string, token: string }) {
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
    init({
      appKey: sdkAppKey.value,
      ...(sdkApiUrl.value ? { apiUrl: sdkApiUrl.value } : {}),
    })

    const params: { user: string, accessToken?: string, password?: string } = {
      user: loginUser.value,
    }
    if (loginMode.value === 'token' && loginToken.value)
      params.accessToken = loginToken.value
    else if (loginMode.value === 'password' && loginPassword.value)
      params.password = loginPassword.value

    await login(params)

    localStorage.setItem('uikit_demo_login_config', JSON.stringify({
      appKey: sdkAppKey.value,
      apiUrl: sdkApiUrl.value,
      user: loginUser.value,
      mode: loginMode.value,
      ...(loginMode.value === 'token'
        ? { token: loginToken.value }
        : { password: loginPassword.value }),
    }))

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
        聊天室变种 Demo 登录
      </h1>
      <p class="login-subtitle">
        纯 @easemob/uikit-chatroom 单包接入（不依赖 IM 包）
      </p>

      <div class="login-form">
        <div class="login-field">
          <label class="login-label">AppKey</label>
          <input v-model="sdkAppKey" placeholder="例如: easemob-demo#support-ngi" class="login-input">
        </div>

        <div class="login-field">
          <label class="login-label">ApiUrl（可选）</label>
          <input v-model="sdkApiUrl" placeholder="默认不填" class="login-input">
        </div>

        <div class="login-field">
          <label class="login-label">快捷账号</label>
          <div class="login-preset-list">
            <button
              v-for="preset in presetUsers"
              :key="preset.user"
              type="button"
              class="login-btn"
              :class="{ 'login-btn--active': loginUser === preset.user }"
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div class="login-field">
          <label class="login-label">用户名</label>
          <input v-model="loginUser" placeholder="请输入用户名" class="login-input">
        </div>

        <div class="login-field">
          <label class="login-label">
            <span>凭证</span>
            <div class="login-mode-switch">
              <button
                class="login-btn login-btn--small"
                :class="{ 'login-btn--active': loginMode === 'password' }"
                @click="loginMode = 'password'"
              >
                密码
              </button>
              <button
                class="login-btn login-btn--small"
                :class="{ 'login-btn--active': loginMode === 'token' }"
                @click="loginMode = 'token'"
              >
                Token
              </button>
            </div>
          </label>
          <input
            v-if="loginMode === 'password'"
            v-model="loginPassword"
            type="password"
            placeholder="请输入密码"
            class="login-input"
            @keydown.enter="handleLogin"
          >
          <input
            v-else
            v-model="loginToken"
            placeholder="请输入 AccessToken"
            class="login-input"
            @keydown.enter="handleLogin"
          >
        </div>

        <div v-if="errorMsg" class="login-error">
          {{ errorMsg }}
        </div>

        <button
          class="login-btn login-btn--primary login-submit"
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
  background: var(--uikit-bg-base, #fff);
}

.login-card {
  width: 100%;
  max-width: 340px;
  padding: 28px 24px;
  border-radius: 12px;
  background: var(--uikit-bg-base, #fff);
  box-shadow: var(--uikit-shadow, 0 6px 16px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
}

.login-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  color: var(--uikit-text-primary, #111827);
}

.login-subtitle {
  margin: 0 0 20px;
  font-size: 12px;
  text-align: center;
  color: var(--uikit-text-tertiary, #9ca3af);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  background: #fef2f2;
  color: #ef4444;
  font-size: 13px;
}

.login-submit {
  height: 40px;
  margin-top: 8px;
  font-size: 15px;
  font-weight: 500;
}

.login-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.login-input:focus {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.login-btn:hover {
  opacity: 0.85;
}

.login-btn--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.login-btn--small {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}

.login-btn--primary {
  background: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: #fff;
  border: none;
}

.login-btn--primary:hover {
  opacity: 0.9;
}

.login-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
