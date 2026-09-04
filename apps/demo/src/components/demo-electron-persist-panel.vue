<script setup lang="ts">
/**
 * Electron 本地持久化测试面板（demo-electron 验证工程，规格书决策 4）。
 *
 * 定位是验证工具 harness 的测试面板，不是产品 UI：仅 Electron 模式且
 * 「本地持久化」开关开启时挂载（demo-page.vue 特性检测），不引入 UI 库。
 *
 * 按钮：库统计 / 灌测试消息 / 中文搜索自测 / 清空全部 / 删库重开 / 断开 SDK（断网模拟）。
 */
import { computed, ref } from 'vue'
import {
  electronPersistClearAll,
  electronPersistDeleteDbAndRelaunch,
  electronPersistSeedConversations,
  electronPersistSeedMessages,
  electronPersistStats,
  electronSetOffline,
  persistReadActivities,
  persistReadCounts,
  persistReadSeen,
} from '../composables/use-electron-persist'

/** 灌数参数 */
const seedConversationId = ref('persist-test')
const seedCount = ref(300)
/** 灌数预设档位（10 万级用于全局搜索 P95 < 500ms 验收） */
const seedPresets = [
  { label: '1千', count: 1000 },
  { label: '1万', count: 10000 },
  { label: '10万', count: 100000 },
] as const
/** 灌数进度（空串 = 未在灌数） */
const seedProgress = ref('')
/** 灌数进行中（期间按钮禁用） */
const seeding = ref(false)
/** 灌会话参数与档位（大会话量渲染压测） */
const seedConversationCount = ref(500)
const seedConversationPresets = [
  { label: '500', count: 500 },
  { label: '2000', count: 2000 },
  { label: '1万', count: 10000 },
] as const
/** 灌会话进度（空串 = 未在灌） */
const seedConversationProgress = ref('')
/** 灌会话进行中 */
const seedingConversations = ref(false)
/** 断网状态（面板本地态） */
const offline = ref(false)
/** 面板收起态（默认收起为小球，点击展开） */
const collapsed = ref(true)
/** 最近一次动作结果反馈 */
const tip = ref('')

/** 本地读取活动：四个方法的展示顺序（方法名为契约 API 名，保持英文） */
const readMethods = ['loadMessages', 'fetchConversations', 'searchMessages', 'searchConversations'] as const

/** 最近一次本地读取明细（如 `loadMessages c1 → 30 条 · 4ms`） */
const lastReadText = computed(() => {
  const last = persistReadActivities.value[0]
  if (!last)
    return ''
  return `${last.method} ${last.detail} → ${last.rows < 0 ? '异常' : `${last.rows} 条`} · ${last.ms}ms`
})

/** 活动记录时间格式化（HH:mm:ss） */
function formatActivityTime(at: number): string {
  return new Date(at).toTimeString().slice(0, 8)
}

async function onStats() {
  const stats = await electronPersistStats()
  console.warn('[electron-persist] getStorageStats', stats)
  tip.value = `库统计已输出到控制台（消息数: ${(stats as { messageCount?: number })?.messageCount ?? '-'}）`
}

async function onSeed(count?: number) {
  const total = count ?? seedCount.value
  if (count !== undefined)
    seedCount.value = count
  seeding.value = true
  seedProgress.value = `已写入 0 / ${total}`
  tip.value = ''
  try {
    const elapsed = await electronPersistSeedMessages(
      seedConversationId.value,
      'singleChat',
      total,
      (done, t) => { seedProgress.value = `已写入 ${done} / ${t}` },
    )
    tip.value = `已向 ${seedConversationId.value} 灌入 ${total} 条测试消息，耗时 ${elapsed}ms`
  }
  catch (error) {
    tip.value = `灌数失败: ${(error as Error).message}`
  }
  finally {
    seeding.value = false
    seedProgress.value = ''
  }
}

async function onSeedConversations(count?: number) {
  const total = count ?? seedConversationCount.value
  if (count !== undefined)
    seedConversationCount.value = count
  seedingConversations.value = true
  seedConversationProgress.value = `已写入 0 / ${total}`
  tip.value = ''
  try {
    const elapsed = await electronPersistSeedConversations(
      total,
      (done, t) => { seedConversationProgress.value = `已写入 ${done} / ${t}` },
    )
    tip.value = `已灌入 ${total} 个测试会话，耗时 ${elapsed}ms（刷新会话列表查看）`
  }
  catch (error) {
    tip.value = `灌会话失败: ${(error as Error).message}`
  }
  finally {
    seedingConversations.value = false
    seedConversationProgress.value = ''
  }
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
      <span v-if="persistReadSeen" class="persist-panel__dot" title="已发生本地库读取" />
    </button>
    <div v-if="!collapsed" class="persist-panel__body">
      <p class="persist-panel__title">
        本地持久化测试面板
      </p>
      <button class="persist-panel__btn" :disabled="seeding" @click="onStats">
        库统计
      </button>
      <div class="persist-panel__seed">
        <input v-model="seedConversationId" class="persist-panel__input" placeholder="conversationId" :disabled="seeding">
        <input v-model.number="seedCount" class="persist-panel__input persist-panel__input--num" type="number" min="1" :disabled="seeding">
        <button class="persist-panel__btn" :disabled="seeding" @click="onSeed()">
          灌测试消息
        </button>
      </div>
      <div class="persist-panel__seed-presets">
        <button
          v-for="p in seedPresets"
          :key="p.count"
          class="persist-panel__btn persist-panel__btn--preset"
          :disabled="seeding"
          @click="onSeed(p.count)"
        >
          {{ p.label }}
        </button>
        <span v-if="seedProgress" class="persist-panel__seed-progress">{{ seedProgress }}</span>
      </div>
      <!-- 灌会话（大会话量渲染压测）：lastMessage* 字段已够列表渲染，不灌消息体 -->
      <div class="persist-panel__seed">
        <input v-model.number="seedConversationCount" class="persist-panel__input persist-panel__input--num" type="number" min="1" :disabled="seedingConversations">
        <button class="persist-panel__btn" :disabled="seedingConversations" @click="onSeedConversations()">
          灌会话
        </button>
        <button
          v-for="p in seedConversationPresets"
          :key="p.count"
          class="persist-panel__btn persist-panel__btn--preset"
          :disabled="seedingConversations"
          @click="onSeedConversations(p.count)"
        >
          {{ p.label }}
        </button>
      </div>
      <p v-if="seedConversationProgress" class="persist-panel__seed-progress">
        {{ seedConversationProgress }}
      </p>
      <button class="persist-panel__btn" :disabled="seeding || seedingConversations" @click="onClearAll">
        清空全部
      </button>
      <button class="persist-panel__btn persist-panel__btn--danger" @click="onDeleteDb">
        删库重开
      </button>
      <button class="persist-panel__btn" :class="{ 'persist-panel__btn--danger': offline }" @click="onToggleOffline">
        {{ offline ? '恢复网络' : '断开 SDK（模拟断网）' }}
      </button>

      <!-- 本地读取活动（repository IPC 代理埋点：数据来自本地库的证据） -->
      <div class="persist-panel__reads">
        <p class="persist-panel__reads-title">
          本地读取活动
        </p>
        <div class="persist-panel__reads-counts">
          <span v-for="m in readMethods" :key="m" class="persist-panel__reads-count">
            {{ m }} × {{ persistReadCounts[m] }}
          </span>
        </div>
        <p v-if="lastReadText" class="persist-panel__reads-last">
          最近：{{ lastReadText }}
        </p>
        <p v-else class="persist-panel__reads-last persist-panel__reads-last--empty">
          暂无本地读取（当前数据来自 SDK 网络加载）
        </p>
        <ul v-if="persistReadActivities.length > 0" class="persist-panel__reads-list">
          <li v-for="(a, i) in persistReadActivities" :key="i" class="persist-panel__reads-item">
            <span class="persist-panel__reads-time">{{ formatActivityTime(a.at) }}</span>
            {{ a.method }} {{ a.detail }} → {{ a.rows < 0 ? '异常' : `${a.rows} 条` }} · {{ a.ms }}ms
          </li>
        </ul>
      </div>

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
  position: relative;
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
  width: 480px;
  max-height: 70vh;
  overflow-y: auto;
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

.persist-panel__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.persist-panel__seed-presets {
  display: flex;
  gap: 6px;
  align-items: center;
}

.persist-panel__btn--preset {
  flex: 0 0 auto;
}

.persist-panel__seed-progress {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

.persist-panel__tip {
  margin: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  word-break: break-all;
}

/* 浮球绿点：发生过本地库读取后常亮（once 语义） */
.persist-panel__dot {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #fff;
}

.persist-panel__reads {
  border-top: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.persist-panel__reads-title {
  margin: 0;
  font-weight: 600;
  font-size: 12px;
  color: var(--uikit-text-primary, #111827);
}

.persist-panel__reads-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.persist-panel__reads-count {
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
}

.persist-panel__reads-last {
  margin: 0;
  font-size: 12px;
  color: var(--uikit-text-primary, #111827);
  word-break: break-all;
}

.persist-panel__reads-last--empty {
  color: var(--uikit-text-secondary, #6b7280);
}

.persist-panel__reads-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.persist-panel__reads-item {
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
  word-break: break-all;
}

.persist-panel__reads-time {
  color: var(--uikit-text-primary, #111827);
  margin-right: 4px;
}
</style>
