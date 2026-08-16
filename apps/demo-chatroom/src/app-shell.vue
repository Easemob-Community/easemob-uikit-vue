<script setup lang="ts">
/**
 * 应用消费侧壳（app.vue 的子组件）：登录门 + hash 路由。
 * 必须与 Provider（app.vue）分属两个组件：inject 只解析父链，
 * 本组件才能拿到 useChatroomProvider provide 的 core context。
 *
 * 本应用是**纯 chatroom 单包形态**（不依赖 @easemob/uikit-im），验证聊天室
 * 场景包独立可用的接入路径（P2 review 遗留项 d 的补证）。
 *
 * P5 PC 模式：新增 #/pc-live（PC 私域直播开播端）、#/pc-class（PC 小班课双端）
 * 两个宽屏路由——app.vue 据此去掉 375px 手机壳、全窗口渲染 split 布局。
 */
import { computed, onMounted, onUnmounted } from 'vue'
import { useClient } from '@easemob/uikit-core'
import DemoLoginPage from './demo-login-page.vue'
import DemoHomePage from './pages/demo-home-page.vue'
import BasicChatroomPage from './pages/basic-chatroom-page.vue'
import VoiceRoomPage from './pages/voice-room-page.vue'
import LiveRoomPage from './pages/live-room-page.vue'
import ClassRoomPage from './pages/class-room-page.vue'
import DanmakuPage from './pages/danmaku-page.vue'
import PcLivePage from './pages/pc-live-page.vue'
import PcClassPage from './pages/pc-class-page.vue'
import { demoRoute } from './demo-route'
import type { DemoRoute } from './demo-route'

const { currentUser } = useClient()

/* ===== hash 路由（空 = 首页；pc-* 为 PC 宽屏页） ===== */
const ROUTE_ALIAS: Record<string, DemoRoute> = {
  '': 'home',
  '#/': 'home',
  '#/basic': 'basic',
  '#/voice': 'voice',
  '#/live': 'live',
  '#/class': 'class',
  '#/danmaku': 'danmaku',
  '#/pc-live': 'pc-live',
  '#/pc-class': 'pc-class',
}

function onHashChange() {
  demoRoute.value = ROUTE_ALIAS[window.location.hash] ?? 'home'
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
  <DemoHomePage v-else-if="demoRoute === 'home'" />
  <BasicChatroomPage v-else-if="demoRoute === 'basic'" />
  <VoiceRoomPage v-else-if="demoRoute === 'voice'" />
  <LiveRoomPage v-else-if="demoRoute === 'live'" />
  <ClassRoomPage v-else-if="demoRoute === 'class'" />
  <DanmakuPage v-else-if="demoRoute === 'danmaku'" />
  <PcLivePage v-else-if="demoRoute === 'pc-live'" />
  <PcClassPage v-else-if="demoRoute === 'pc-class'" />
</template>
