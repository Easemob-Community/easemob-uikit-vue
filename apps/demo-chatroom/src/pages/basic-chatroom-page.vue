<script setup lang="ts">
/**
 * 基础聊天室页：标准三步接入（Provider 已在 app.vue 装配）。
 * 场景 = custom（兜底场景）：全屏布局 + 成员面板 + 公告条。
 * 页面形态 = 正常聊天室 App：导航头 / 公告 / 消息流 / 输入条 / 成员面板。
 */
import { ref } from 'vue'
import { EmChatroomContainer } from '@easemob/uikit-chatroom'
import DemoSceneHeader from '../components/demo-scene-header.vue'

/** 默认联调聊天室（用户提供）；可改 */
const DEFAULT_ROOM_ID = '315874547400706'

const roomIdInput = ref(DEFAULT_ROOM_ID)
const activeRoomId = ref('')
/** 加入失败提示（容器 join-error 事件） */
const joinError = ref('')
/** 消息区形态：默认列表 / 弹幕流（示范 #message-list 插槽整块替换消息流） */
const danmakuMode = ref(false)

/** 消息文本（notice/txt 消息体均为 { content }；模板内避免 TS 断言） */
function messageText(msg: { body?: unknown }): string {
  const body = msg.body as { content?: string } | undefined
  return body?.content ?? ''
}

function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  joinError.value = ''
  activeRoomId.value = id
}

function handleExit() {
  activeRoomId.value = ''
  joinError.value = ''
}

function handleJoinError(error: unknown) {
  joinError.value = (error as Error).message || '加入失败'
}
</script>

<template>
  <div class="basic-page">
    <DemoSceneHeader title="基础聊天室">
      <span>{{ activeRoomId ? `房间 ${activeRoomId.slice(0, 8)}…` : '未加入' }}</span>
    </DemoSceneHeader>

    <!-- 未进房：房间入口（正常 App 的「输入房间号进入」形态） -->
    <div v-if="!activeRoomId" class="basic-page__entry">
      <div class="basic-page__entry-card">
        <div class="basic-page__entry-title">
          加入聊天室
        </div>
        <div class="basic-page__entry-desc">
          输入聊天室 ID 进入（默认已填入联调房间）
        </div>
        <input
          v-model="roomIdInput"
          class="basic-page__input"
          type="text"
          placeholder="输入聊天室 ID（如 room123）"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="basic-page__error">
          加入失败：{{ joinError }}
        </div>
        <button class="basic-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          进入聊天室
        </button>
      </div>
    </div>

    <!-- 已进房：完整聊天室（容器；features.header:false 隐藏内置 header——
         页面导航头由 DemoSceneHeader 承担，示范「隐藏内置 header 让用户接管」） -->
    <EmChatroomContainer
      v-else
      class="basic-page__container"
      :room-id="activeRoomId"
      :scene="{ name: 'custom', features: { header: false } }"
      @back="handleExit"
      @kicked="handleExit"
      @destroyed="handleExit"
      @join-error="handleJoinError"
    >
      <!-- 工具条：消息区形态切换（默认列表 / 弹幕流，示范 #message-list 整块替换） -->
      <template #toolbar>
        <div class="basic-page__toolbar">
          <button class="basic-page__toolbar-btn" @click="danmakuMode = !danmakuMode">
            {{ danmakuMode ? '弹幕流（#message-list 接管中）' : '默认消息列表' }}
          </button>
        </div>
      </template>

      <!-- #message-list：整块替换消息列表区（加载更多/空态/滚动跟随职责转移业务；
           提供后 message-item/message-custom/empty 插槽自然失效） -->
      <template v-if="danmakuMode" #message-list="{ messages }">
        <div class="basic-page__danmaku">
          <div
            v-for="msg in messages"
            :key="msg.msgLocalId || msg.msgServerId || msg.localId"
            class="basic-page__danmaku-item"
          >
            <span class="basic-page__danmaku-name">{{ msg.from }}</span>
            <span class="basic-page__danmaku-content">
              {{ messageText(msg) }}
            </span>
          </div>
          <div v-if="messages.length === 0" class="basic-page__danmaku-empty">
            暂无消息（消息流已由 #message-list 插槽接管）
          </div>
        </div>
      </template>
    </EmChatroomContainer>
  </div>
</template>

<style scoped>
.basic-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--uikit-bg-base, #fff);
}

.basic-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.basic-page__entry-card {
  width: 100%;
  max-width: 320px;
  padding: 24px 20px;
  border-radius: 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  background: var(--uikit-bg-elevated, #fff);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.basic-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.basic-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

.basic-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.basic-page__input:focus {
  border-color: var(--uikit-primary-color);
}

.basic-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.basic-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.basic-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.basic-page__container {
  flex: 1;
  min-height: 0;
}

/* ===== #message-list 整块替换演示（P6-4） ===== */
.basic-page__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base, #fff));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

.basic-page__toolbar-btn {
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 999px;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-secondary, #6b7280);
  font-size: 12px;
  cursor: pointer;
}

.basic-page__danmaku {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
}

.basic-page__danmaku-item {
  align-self: flex-start;
  max-width: 92%;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.6);
  color: #fff;
  font-size: 12px;
  display: flex;
  gap: 6px;
}

.basic-page__danmaku-name {
  flex-shrink: 0;
  font-weight: 600;
  color: #ffd666;
}

.basic-page__danmaku-content {
  min-width: 0;
  word-break: break-word;
}

.basic-page__danmaku-empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--uikit-text-tertiary, #9ca3af);
  font-size: 12px;
}
</style>
