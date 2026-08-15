<script setup lang="ts">
/**
 * 应用消费侧壳（app.vue 的子组件）：登录门 + hash 路由。
 * 必须与 Provider（app.vue）分属两个组件：inject 只解析父链，
 * 本组件才能拿到 useChatroomProvider provide 的 core context。
 *
 * 本应用是**纯 chatroom 单包形态**（不依赖 @easemob/uikit-im），验证聊天室
 * 场景包独立可用的接入路径（P2 review 遗留项 d 的补证）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useClient } from '@easemob/uikit-core'
import DemoLoginPage from './demo-login-page.vue'
import DemoHomePage from './pages/demo-home-page.vue'
import BasicChatroomPage from './pages/basic-chatroom-page.vue'
import VoiceRoomPage from './pages/voice-room-page.vue'
import LiveRoomPage from './pages/live-room-page.vue'
import ClassRoomPage from './pages/class-room-page.vue'
import DanmakuPage from './pages/danmaku-page.vue'

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

/** 登录成功后回首页 */
function handleLoginSuccess() {
  window.location.hash = '#/'
}
</script>

<template>
  <!-- 登录门：未登录渲染登录页 -->
  <DemoLoginPage v-if="!isLoggedIn" @login-success="handleLoginSuccess" />

  <!-- 已登录：hash 路由 -->
  <DemoHomePage v-else-if="route === 'home'" />
  <BasicChatroomPage v-else-if="route === 'basic'" />
  <VoiceRoomPage v-else-if="route === 'voice'" />
  <LiveRoomPage v-else-if="route === 'live'" />
  <ClassRoomPage v-else-if="route === 'class'" />
  <DanmakuPage v-else-if="route === 'danmaku'" />
</template>
