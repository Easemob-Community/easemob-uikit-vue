<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { EmUIKitProvider, useClient } from '@easemob/uikit-im'
import type { UiContact } from '@easemob/uikit-im'
import DemoPage from './demo-page.vue'
import LoginPage from './login-page.vue'
import { demoCollectSdkLog, demoSdkLogLevel, demoUikitLogLevel, noticeConfig } from './composables/use-demo-settings'

/**
 * Provider 三开关 × dataSource 演示
 *
 * - enableContact / enableBlocklist / enablePresence
 *   默认 true。关闭后：
 *     1) 登录后 Provider 不会拉取对应列表（黑名单同步，好友需 ContactContainer 触发）
 *     2) 事件接收器不会挂载对应 SDK 事件
 *   3) Presence 关闭后，ContactItem 等位置不再展示在线状态指示器
 *
 * - dataSource：业务可提供自定义接口接管 SDK 默认实现。
 *   下面展示一个只覆盖 fetchContacts 的最小例子。
 */
const enableContact = ref(true)
const enableBlocklist = ref(true)
const enablePresence = ref(true)
const enableDraft = ref(true)
const enableAtMe = ref(true)
const enableTyping = ref(true)

/** 是否启用 demo 提供的自定义 dataSource（演示业务接管拉好友逻辑） */
const useCustomDataSource = ref(false)

const customDataSource = {
  /** 示例：业务从自己后端拉取联系人。 */
  async fetchContacts(): Promise<{ list: UiContact[]; cursor?: string; hasMore?: boolean }> {
    // 实际使用时请替换为业务 API
    return {
      list: [
        { userId: 'biz_alice', name: 'Alice (业务接口)' },
        { userId: 'biz_bob', name: 'Bob (业务接口)' },
      ],
      hasMore: false,
    }
  },
}

/** 从 localStorage 读取登录配置 */
function getLoginConfig() {
  try {
    const raw = localStorage.getItem('uikit_demo_login_config')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/* ========== 内部组件：必须在 EmUIKitProvider 内才能使用 useClient ========== */
const AppContent = {
  emits: ['login-success', 'logout'],
  setup(_props: unknown, { emit }: { emit: (e: 'login-success' | 'logout') => void }) {
    const { init, login } = useClient()

    const isLoggedIn = ref(false)
    const autoLoggingIn = ref(false)
    const autoLoginError = ref('')

    async function autoLogin() {
      const config = getLoginConfig()
      if (!config || !config.user) return

      autoLoggingIn.value = true
      autoLoginError.value = ''
      try {
        init({
          appKey: config.appKey,
          ...(config.apiUrl ? { apiUrl: config.apiUrl } : {}),
          debug: config.debug,
        })

        const params: { user: string; accessToken?: string; password?: string } = {
          user: config.user,
        }
        if (config.mode === 'token' && config.token) {
          params.accessToken = config.token
        } else if (config.mode === 'password' && config.password) {
          params.password = config.password
        }

        await login(params)
        isLoggedIn.value = true
      } catch (err) {
        autoLoginError.value = (err as Error).message
        localStorage.removeItem('uikit_demo_login_config')
      } finally {
        autoLoggingIn.value = false
      }
    }

    onMounted(() => {
      const config = getLoginConfig()
      if (config?.user) {
        autoLogin()
      }
    })

    function onLoginSuccess() {
      isLoggedIn.value = true
    }

    function onLogout() {
      localStorage.removeItem('uikit_demo_login_config')
      isLoggedIn.value = false
      emit('logout')
    }

    return () => {
      if (autoLoggingIn.value) {
        return h('div', { class: 'auto-login-loading' }, [
          h('div', { class: 'auto-login-spinner' }),
          h('span', null, '正在自动登录...'),
        ])
      }
      if (autoLoginError.value || !isLoggedIn.value) {
        return h(LoginPage, { onLoginSuccess })
      }
      return h(DemoPage, {
        'enableContact': enableContact.value,
        'onUpdate:enableContact': (v: boolean) => { enableContact.value = v },
        'enableBlocklist': enableBlocklist.value,
        'onUpdate:enableBlocklist': (v: boolean) => { enableBlocklist.value = v },
        'enablePresence': enablePresence.value,
        'onUpdate:enablePresence': (v: boolean) => { enablePresence.value = v },
        'enableDraft': enableDraft.value,
        'onUpdate:enableDraft': (v: boolean) => { enableDraft.value = v },
        'enableAtMe': enableAtMe.value,
        'onUpdate:enableAtMe': (v: boolean) => { enableAtMe.value = v },
        'enableTyping': enableTyping.value,
        'onUpdate:enableTyping': (v: boolean) => { enableTyping.value = v },
        'useCustomDataSource': useCustomDataSource.value,
        'onUpdate:useCustomDataSource': (v: boolean) => { useCustomDataSource.value = v },
        onLogout,
      })
    }
  },
}
</script>

<template>
  <EmUIKitProvider
    :auto-init="false"
    :enable-contact="enableContact"
    :enable-blocklist="enableBlocklist"
    :enable-presence="enablePresence"
    :enable-draft="enableDraft"
    :enable-at-me="enableAtMe"
    :enable-typing="enableTyping"
    :data-source="useCustomDataSource ? customDataSource : undefined"
    :h5="{ safeArea: true, keyboardAdapt: true, pullRefresh: 'auto' }"
    :logger="{ collectSdkLog: demoCollectSdkLog, uikitLevel: demoUikitLogLevel, sdkLevel: demoSdkLogLevel }"
    :notice-config="noticeConfig"
  >
    <AppContent />
  </EmUIKitProvider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

.auto-login-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  gap: 16px;
  background-color: var(--uikit-bg-base, #ffffff);
  color: var(--uikit-text-secondary, #6b7280);
  font-size: 14px;
}

.auto-login-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--uikit-bg-secondary, #e5e7eb);
  border-top-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
