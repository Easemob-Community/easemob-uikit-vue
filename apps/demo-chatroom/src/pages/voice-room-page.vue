<script setup lang="ts">
/**
 * 语聊房页：voice preset 变种。
 * - 麦位区（8 麦位：上麦 / 下麦 / 管理员抱下）随 features.micQueue 自动渲染在消息区上方，
 *   状态存 voice:micQueue 房间属性——两个账号分别登录即可看到麦位实时同步；
 * - voice preset 内置 messageFilter 过滤图片消息（语音房以文字/语音互动为主）；
 * - 全员禁言入口随 features.muteAll 出现在成员面板（owner/admin 可用）。
 */
import { ref } from 'vue'
import { EmChatroomContainer } from '@easemob/uikit-chatroom'
import DemoSceneHeader from '../components/demo-scene-header.vue'

const DEFAULT_ROOM_ID = '315874547400706'

const roomIdInput = ref(DEFAULT_ROOM_ID)
const activeRoomId = ref('')
const joinError = ref('')

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
  <div class="voice-page">
    <DemoSceneHeader title="语聊房">
      <span>{{ activeRoomId ? `房间 ${activeRoomId.slice(0, 8)}…` : '未加入' }}</span>
    </DemoSceneHeader>

    <!-- 房间入口（提示双账号联调麦位） -->
    <div v-if="!activeRoomId" class="voice-page__entry">
      <div class="voice-page__entry-card">
        <div class="voice-page__entry-title">
          🎙️ 进入语聊房
        </div>
        <div class="voice-page__entry-desc">
          语音房场景：8 麦位实时同步（属性通道）。建议双账号（hfp / pfh）联调：
          一个上麦，另一个账号刷新即可看到麦位变化。
        </div>
        <input
          v-model="roomIdInput"
          class="voice-page__input"
          type="text"
          placeholder="输入聊天室 ID"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="voice-page__error">
          加入失败：{{ joinError }}
        </div>
        <button class="voice-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          上麦开聊
        </button>
      </div>
    </div>

    <!-- 语聊房容器（voice preset：公告 + 麦位 + 消息流 + 输入条） -->
    <EmChatroomContainer
      v-else
      class="voice-page__container"
      :room-id="activeRoomId"
      scene="voice"
      @back="handleExit"
      @kicked="handleExit"
      @destroyed="handleExit"
      @join-error="handleJoinError"
    />
  </div>
</template>

<style scoped>
.voice-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--uikit-bg-base, #fff);
}

.voice-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.voice-page__entry-card {
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

.voice-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.voice-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.voice-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.voice-page__input:focus {
  border-color: var(--uikit-primary-color);
}

.voice-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.voice-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.voice-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-page__container {
  flex: 1;
  min-height: 0;
}
</style>
