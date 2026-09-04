<script setup lang="ts">
/**
 * Electron 本地持久化测试面板（demo-electron 验证工程，规格书决策 4）。
 *
 * 定位是验证工具 harness 的测试面板，不是产品 UI：仅 Electron 模式且
 * 「本地持久化」开关开启时挂载（demo-page.vue 特性检测），不引入 UI 库。
 *
 * 按钮：库统计 / 灌测试消息 / 中文搜索自测 / 清空全部 / 删库重开 / 断开 SDK（断网模拟）。
 */
import { ref } from 'vue'
import {
  electronPersistClearAll,
  electronPersistDeleteDbAndRelaunch,
  electronPersistSeedMessages,
  electronPersistStats,
  electronSetOffline,
} from '../composables/use-electron-persist'

/** 灌数参数 */
const seedConversationId = ref('persist-test')
const seedCount = ref(300)
/** 断网状态（面板本地态） */
const offline = ref(false)
/** 面板收起态（默认收起为小球，点击展开） */
const collapsed = ref(true)
/** 最近一次动作结果反馈 */
const tip = ref('')

async function onStats() {
  const stats = await electronPersistStats()
  console.warn('[electron-persist] getStorageStats', stats)
  tip.value = `库统计已输出到控制台（消息数: ${(stats as { messageCount?: number })?.messageCount ?? '-'}）`
}

async function onSeed() {
  await electronPersistSeedMessages(seedConversationId.value, 'singleChat', seedCount.value)
  tip.value = `已向 ${seedConversationId.value} 灌入 ${seedCount.value} 条测试消息`
}

async function onClearAll() {
  await electronPersistClearAll()
  tip.value = '已清空全部本地数据（clearAll + 水位线）'
}

async function onDeleteDb() {
  tip.value = '已删除库文件，正在重启…'
  await electronPersistDeleteDbAndRelaunch()
}

async function onToggleOffline() {
  offline.value = !offline.value
  await electronSetOffline(offline.value)
  tip.value = offline.value ? '已断网（SDK 连接已切断）' : '已恢复网络（SDK 自动重连中）'
}
</script>

<template>
  <div class="persist-panel" :class="{ 'persist-panel--collapsed': collapsed }">
    <button
      class="persist-panel__fab"
      title="Electron 本地持久化测试面板"
      @click="collapsed = !collapsed"
    >
      DB
    </button>
    <div v-if="!collapsed" class="persist-panel__body">
      <p class="persist-panel__title">
        本地持久化测试面板
      </p>
      <button class="persist-panel__btn" @click="onStats">
        库统计
      </button>
      <div class="persist-panel__seed">
        <input v-model="seedConversationId" class="persist-panel__input" placeholder="conversationId">
        <input v-model.number="seedCount" class="persist-panel__input persist-panel__input--num" type="number" min="1">
        <button class="persist-panel__btn" @click="onSeed">
          灌测试消息
        </button>
      </div>
      <button class="persist-panel__btn" @click="onClearAll">
        清空全部
      </button>
      <button class="persist-panel__btn persist-panel__btn--danger" @click="onDeleteDb">
        删库重开
      </button>
      <button class="persist-panel__btn" :class="{ 'persist-panel__btn--danger': offline }" @click="onToggleOffline">
        {{ offline ? '恢复网络' : '断开 SDK（模拟断网）' }}
      </button>
      <p v-if="tip" class="persist-panel__tip">
        {{ tip }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.persist-panel {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 1000;
  font-size: 13px;
}

.persist-panel__fab {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--uikit-primary-color, #009eff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.persist-panel__body {
  position: absolute;
  left: 0;
  bottom: 48px;
  width: 260px;
  padding: 12px;
  border-radius: 10px;
  background: var(--uikit-bg-base, #fff);
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.persist-panel__title {
  margin: 0;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.persist-panel__seed {
  display: flex;
  gap: 6px;
  align-items: center;
}

.persist-panel__input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 6px;
  font-size: 12px;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.persist-panel__input--num {
  flex: 0 0 56px;
}

.persist-panel__btn {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.persist-panel__btn--danger {
  background: #fef2f2;
  color: #ef4444;
}

.persist-panel__tip {
  margin: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  word-break: break-all;
}
</style>
