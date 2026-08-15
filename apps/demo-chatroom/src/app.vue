<script setup lang="ts">
/**
 * demo-chatroom 应用壳：移动端窄屏视口（375px 基准，PC 上居中呈现手机页面）
 * + hash 路由（五个变种页面 + 首页导航）+ 登录门 + 聊天室 Provider 装配。
 *
 * 本应用是**纯 chatroom 单包形态**（不依赖 @easemob/uikit-im），验证聊天室
 * 场景包独立可用的接入路径（P2 review 遗留项 d 的补证）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useClient } from '@easemob/uikit-core'
import { useChatroomProvider } from '@easemob/uikit-chatroom'
import DemoLoginPage from './demo-login-page.vue'
import DemoHomePage from './pages/demo-home-page.vue'
import BasicChatroomPage from './pages/basic-chatroom-page.vue'
import VoiceRoomPage from './pages/voice-room-page.vue'
import LiveRoomPage from './pages/live-room-page.vue'
import ClassRoomPage from './pages/class-room-page.vue'
import DanmakuPage from './pages/danmaku-page.vue'

/** 从 localStorage 读取登录配置（与 apps/demo 共用 uikit_demo_login_config） */
function getLoginConfig() {
  try {
    const raw = localStorage.getItem('uikit_demo_login_config')
    return raw ? JSON.parse(raw) as { appKey?: string, apiUrl?: string, debug?: boolean } : null
  }
  catch {
    return null
  }
}

const config = getLoginConfig()

// 聊天室 Provider：core 生命周期 + [ChatManager, ChatRoomManager, UserInfoManager] 注入
useChatroomProvider({
  appKey: config?.appKey ?? '',
  ...(config?.apiUrl ? { apiUrl: config.apiUrl } : {}),
  ...(config?.debug ? { debug: true } : {}),
})

const { currentUser } = useClient()

/* ===== hash 路由（#/basic #/voice #/live #/class #/danmaku；空 = 首页） ===== */
type RouteName = 'home' | 'basic' | 'voice' | 'live' | 'class' | 'danmaku'

const ROUTE_ALIAS: Record<string, RouteName> = {
  '': 'home',
  '#/': 'home',
  '#/basic': 'basic',
  '#/voice': 'voice',
  '#/live': 'live',
  '#/class': 'class',
  '#/danmaku': 'danmaku',
}

const route = ref<RouteName>('home')

function onHashChange() {
  route.value = ROUTE_ALIAS[window.location.hash] ?? 'home'
}

onMounted(() => {
  onHashChange()
  window.addEventListener('hashchange', onHashChange)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
})

const isLoggedIn = computed(() => Boolean(currentUser.value))

/** 登录成功后回首页（hash 已在登录页内跳转） */
function handleLoginSuccess() {
  window.location.hash = '#/'
}
</script>

<template>
  <div class="phone-shell">
    <div class="phone-shell__screen">
      <!-- 登录门：未登录渲染登录页 -->
      <DemoLoginPage v-if="!isLoggedIn" @login-success="handleLoginSuccess" />

      <!-- 已登录：hash 路由 -->
      <DemoHomePage v-else-if="route === 'home'" />
      <BasicChatroomPage v-else-if="route === 'basic'" />
      <VoiceRoomPage v-else-if="route === 'voice'" />
      <LiveRoomPage v-else-if="route === 'live'" />
      <ClassRoomPage v-else-if="route === 'class'" />
      <DanmakuPage v-else-if="route === 'danmaku'" />
    </div>
  </div>
</template>

<style scoped>
/* 移动端窄屏壳：PC 上 375px 居中呈现手机页面，移动端全宽 */
.phone-shell {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  background: #1f2937;
}

.phone-shell__screen {
  position: relative;
  width: 100%;
  max-width: 375px;
  height: 100%;
  background: var(--uikit-bg-base, #fff);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (min-width: 500px) {
  .phone-shell__screen {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 12px 48px rgba(0, 0, 0, 0.5);
  }
}
</style>
