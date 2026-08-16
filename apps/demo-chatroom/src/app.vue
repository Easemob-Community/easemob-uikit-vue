<script setup lang="ts">
/**
 * 应用壳：移动端窄屏视口（375px 基准，PC 上居中呈现手机页面）+ 聊天室 Provider 装配。
 *
 * 注意：Provider 装配（provide 侧）与 useClient 等消费侧必须分属不同组件——
 * Vue 的 inject 只解析父组件链，同一组件 setup 内 provide 的值对自身不可见。
 * 消费侧逻辑在 app-shell.vue（子组件）。
 */
import { computed, onMounted } from 'vue'
import { setChatroomPopupTarget, useChatroomProvider } from '@easemob/uikit-chatroom'
import AppShell from './app-shell.vue'
import { demoRoute, isDemoPcRoute } from './demo-route'

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

// 弹层打进手机壳（表情/成员面板/操作菜单/公告编辑随壳定位与限宽，
// 而非视口全宽错位——壳 transform 建立 fixed 包含块，见 .phone-shell__screen）
onMounted(() => {
  setChatroomPopupTarget('.phone-shell__screen')
})

/** PC 宽屏路由：不套 375px 手机壳，全窗口渲染（P5 split 布局验收） */
const isPcPage = computed(() => isDemoPcRoute(demoRoute.value))
</script>

<template>
  <div class="phone-shell">
    <div class="phone-shell__screen" :class="{ 'phone-shell__screen--wide': isPcPage }">
      <AppShell />
    </div>
  </div>
</template>

<style scoped>
/* 移动端窄屏壳：PC 上 375px 居中呈现手机页面，移动端全宽；PC 路由全窗口宽 */
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
  /* fixed 包含块：弹层（EmPopup 等 teleport 进壳）按壳定位限宽，而非视口全宽 */
  transform: translateZ(0);
}

/* PC 宽屏路由（#/pc-live、#/pc-class）：去掉 375px 上限，全窗口渲染 */
.phone-shell__screen--wide {
  max-width: none;
}

@media (min-width: 500px) {
  .phone-shell__screen:not(.phone-shell__screen--wide) {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 12px 48px rgba(0, 0, 0, 0.5);
  }
}
</style>
