<script setup lang="ts">
/**
 * 小班课页：class preset 变种（课堂纪律优先——无礼物/麦位，成员面板 + 公告 + 全员禁言）。
 * 老师（房主/管理员）可在成员面板禁言 / 踢人 / 设管理员，公告条可编辑；
 * 学生端同一页面自动降级（无管理入口）。
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
  <div class="class-page">
    <DemoSceneHeader title="小班课">
      <span>{{ activeRoomId ? '上课中' : '未开课' }}</span>
    </DemoSceneHeader>

    <!-- 开课入口 -->
    <div v-if="!activeRoomId" class="class-page__entry">
      <div class="class-page__entry-card">
        <div class="class-page__entry-title">
          📖 进入课堂
        </div>
        <div class="class-page__entry-desc">
          小班课场景：课堂纪律优先——无礼物/麦位，公告 + 成员管理（老师可禁言 / 踢人 /
          全员禁言 / 编辑公告）。用房主账号登录可见管理能力，学生账号自动降级。
        </div>
        <input
          v-model="roomIdInput"
          class="class-page__input"
          type="text"
          placeholder="输入聊天室 ID（课堂房间）"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="class-page__error">
          加入失败：{{ joinError }}
        </div>
        <button class="class-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          进入课堂
        </button>
      </div>
    </div>

    <!-- 课堂容器（class preset：公告 + 消息流 + 输入条 + 成员面板；
         features.header:false 隐藏内置 header，导航头由 DemoSceneHeader 承担） -->
    <EmChatroomContainer
      v-else
      class="class-page__container"
      :room-id="activeRoomId"
      :scene="{ name: 'class', features: { header: false } }"
      @back="handleExit"
      @kicked="handleExit"
      @destroyed="handleExit"
      @join-error="handleJoinError"
    />
  </div>
</template>

<style scoped>
.class-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--uikit-bg-base, #fff);
}

.class-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.class-page__entry-card {
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

.class-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.class-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.class-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.class-page__input:focus {
  border-color: var(--uikit-primary-color);
}

.class-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.class-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.class-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.class-page__container {
  flex: 1;
  min-height: 0;
}
</style>
