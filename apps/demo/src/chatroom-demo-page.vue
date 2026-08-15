<script setup lang="ts">
/**
 * 聊天室 Demo 验证页（P2 验收：三步接入跑通基础聊天室）。
 *
 * 三步接入：
 * 1. 组合 chatroom Provider（useChatroomProvider：core 生命周期 + 场景 manager 注入
 *    [ChatManager, ChatRoomManager, UserInfoManager]，不新增 Provider 概念）；
 * 2. 挂 EmChatroomContainer（room-id + auto-join）；
 * 3. 登录态复用：本页嵌套在 app.vue 的 EmUIKitProvider（IM 场景）内部，
 *    同时验证「IM + chatroom 两包同装」（SDK 单例配置对齐 + 事件按 chatType 隔离）。
 *
 * 聊天室是独立场景包：与 IM 主界面（会话/联系人）互不干扰，页面高度 100% 全屏。
 */
import { computed, onUnmounted, ref } from 'vue'
import { EmChatroomContainer, useChatroomProvider } from '@easemob/uikit-chatroom'
import { useClient } from '@easemob/uikit-im'

/** 从 localStorage 读取登录配置（app.vue 写入的 uikit_demo_login_config） */
function getLoginConfig() {
  try {
    const raw = localStorage.getItem('uikit_demo_login_config')
    return raw ? JSON.parse(raw) as { appKey?: string, user?: string } : null
  }
  catch {
    return null
  }
}

const config = getLoginConfig()
const { currentUser } = useClient()

/** 房间 ID 输入与当前活动房间 */
const roomIdInput = ref('')
const activeRoomId = ref('')

/** 聊天室 Provider（两包同装：SDK 单例已由 IM 初始化，此处经 core 对齐复用并追加注册 ChatRoomManager） */
const chatroomCtx = useChatroomProvider(
  { appKey: config?.appKey ?? '' },
  {
    chatroomCallbacks: {
      onKicked: () => {
        activeRoomId.value = ''
      },
      onDestroyed: () => {
        activeRoomId.value = ''
      },
    },
  },
)

/** 返回 IM 主界面（hash 路由回退） */
function goBack() {
  window.location.hash = ''
}

/** 加入输入的房间 */
function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  activeRoomId.value = id
}

/** 退出聊天室（容器 header 的退出按钮走 useChatroom.leave；此处仅清视图） */
function handleExit() {
  activeRoomId.value = ''
}

/** 页面卸载：离开聊天室（两包同装下不登出 IM 登录态） */
onUnmounted(() => {
  void chatroomCtx.stores.chatroom.reset()
})

const isLoggedIn = computed(() => Boolean(currentUser.value))
</script>

<template>
  <div class="chatroom-demo">
    <div class="chatroom-demo__bar">
      <button class="chatroom-demo__back" @click="goBack">← 返回 IM Demo</button>
      <span class="chatroom-demo__title">聊天室 Demo（P2 验证页）</span>
      <span class="chatroom-demo__badge">两包同装验证中</span>
    </div>

    <div v-if="!isLoggedIn" class="chatroom-demo__tip">
      请先在 IM Demo 登录后进入本页。
    </div>

    <template v-else>
      <div class="chatroom-demo__entry">
        <input
          v-model="roomIdInput"
          class="chatroom-demo__input"
          type="text"
          placeholder="输入聊天室 ID（如 room123）"
        >
        <button class="chatroom-demo__join" :disabled="!roomIdInput.trim()" @click="handleJoin">
          加入
        </button>
        <button v-if="activeRoomId" class="chatroom-demo__exit" @click="handleExit">
          退出
        </button>
      </div>

      <!-- 三步接入第二步：容器（room-id 变化自动 join，auto-join 默认开启） -->
      <EmChatroomContainer
        v-if="activeRoomId"
        class="chatroom-demo__container"
        :room-id="activeRoomId"
        :scene="{ name: 'custom', layout: 'fullscreen', features: { memberList: 'panel', announcement: true } }"
        @kicked="handleExit"
        @destroyed="handleExit"
      />
      <div v-else class="chatroom-demo__placeholder">
        输入聊天室 ID 并点击「加入」开始体验（消息收发 / 成员面板 / 系统通知 / 禁言操作）
      </div>
    </template>
  </div>
</template>

<style scoped>
.chatroom-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--uikit-bg-base);
}

.chatroom-demo__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.chatroom-demo__back {
  border: none;
  background: none;
  color: var(--uikit-primary-color);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.chatroom-demo__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chatroom-demo__badge {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(51, 177, 255, 0.12);
  color: var(--uikit-primary-color);
}

.chatroom-demo__tip {
  padding: 32px 16px;
  text-align: center;
  color: var(--uikit-text-secondary);
}

.chatroom-demo__entry {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  flex-shrink: 0;
}

.chatroom-demo__input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.chatroom-demo__join,
.chatroom-demo__exit {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: #fff;
  background: var(--uikit-primary-color);
}

.chatroom-demo__join:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chatroom-demo__exit {
  background: var(--uikit-danger-color, #e5484d);
}

.chatroom-demo__container {
  flex: 1;
  min-height: 0;
}

.chatroom-demo__placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--uikit-text-tertiary);
  font-size: 13px;
}
</style>
