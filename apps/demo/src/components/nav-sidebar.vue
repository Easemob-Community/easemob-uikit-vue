<script setup lang="ts">
/**
 * Demo 应用的左侧导航栏（仿微信形态）
 *
 * 设计取舍：
 * - 仅作为 demo 业务壳存在，不进入 @easemob/uikit-im 包，避免 IM UIKit 边界扩散到"应用 Shell"层
 * - tab 列表硬编码 + 底部工具区，结构稳定且简单；如需扩展，复制本组件即可
 * - 状态：tab 切换通过 v-model；主题切换/设置入口由本组件内部直接消费 useTheme + 通过 emit 暴露
 */
import { computed } from 'vue'
import { EmIcon, EmBadge, EmPresenceAvatar, useTheme, useClient, useConversationStore, useOwnUserInfo, usePresence, useContact } from '@easemob/uikit-im'

interface Props {
  /** 当前激活 tab key */
  modelValue: 'conversation' | 'contact'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: Props['modelValue']): void
  (e: 'open-settings'): void
}>()

const { mode, isDark, setMode } = useTheme()
const { currentUser } = useClient()
const { avatarUrl, displayName } = useOwnUserInfo()
const conversationStore = useConversationStore()
const { inviteList } = useContact()
const { fetchPresence } = usePresence()

/** 好友申请 / 群邀请待处理数量 */
const pendingNoticeCount = computed(() => inviteList.value.filter(i => i.status === 'pending').length)

/** 发布状态后主动拉取一次，确保头像立即刷新 */
function refreshOwnPresence() {
  if (!currentUser.value)
    return
  void fetchPresence([currentUser.value])
}

/** 全部未读数聚合（忽略静音会话） */
const totalUnread = computed(() => {
  return conversationStore.conversationList.reduce((sum, c) => {
    if (c.isMuted) return sum
    return sum + (c.unreadCount || 0)
  }, 0)
})

const tabs = [
  { key: 'conversation' as const, icon: 'bubble/rect/empty', label: '消息' },
  { key: 'contact' as const, icon: 'person/list', label: '通讯录' },
]

function selectTab(key: Props['modelValue']) {
  emit('update:modelValue', key)
}

function toggleMode() {
  const next = mode.value === 'light' ? 'dark' : mode.value === 'dark' ? 'auto' : 'light'
  setMode(next)
}
</script>

<template>
  <aside class="nav-sidebar">
    <!-- 顶部：当前用户头像 -->
    <div class="nav-sidebar__top">
      <EmPresenceAvatar
        :user-id="currentUser || 'Guest'"
        :src="avatarUrl"
        :name="displayName || currentUser || 'Guest'"
        :size="40"
        editable
        selector-placement="right"
        @presence-changed="refreshOwnPresence"
      />
    </div>

    <!-- 主体：业务 tab -->
    <nav class="nav-sidebar__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="nav-item"
        :class="{ 'nav-item--active': modelValue === tab.key }"
        :title="tab.label"
        @click="selectTab(tab.key)"
      >
        <EmBadge
          v-if="tab.key === 'conversation' && totalUnread > 0"
          :count="totalUnread"
          class="nav-item__badge"
        >
          <EmIcon :name="tab.icon" :size="22" />
        </EmBadge>
        <EmBadge
          v-else-if="tab.key === 'contact' && pendingNoticeCount > 0"
          :count="pendingNoticeCount"
          class="nav-item__badge"
        >
          <EmIcon :name="tab.icon" :size="22" />
        </EmBadge>
        <EmIcon v-else :name="tab.icon" :size="22" />
      </button>
    </nav>

    <!-- 底部：辅助操作 -->
    <div class="nav-sidebar__bottom">
      <button
        type="button"
        class="nav-item"
        :title="mode === 'auto' ? '跟随系统' : isDark ? '切换亮色' : '切换暗色'"
        @click="toggleMode"
      >
        <span class="nav-item__emoji">{{ mode === 'auto' ? '🖥️' : isDark ? '☀️' : '🌙' }}</span>
      </button>
      <button
        type="button"
        class="nav-item"
        title="设置"
        @click="emit('open-settings')"
      >
        <EmIcon name="flower" :size="22" />
      </button>
    </div>

  </aside>
</template>

<style scoped>
.nav-sidebar {
  width: 60px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--uikit-bg-secondary, #f5f5f5);
  border-right: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
  user-select: none;
}

.nav-sidebar__top {
  padding: 16px 0 12px;
  display: flex;
  justify-content: center;
}

.nav-sidebar__tabs {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  overflow: hidden;
}

.nav-sidebar__bottom {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0 16px;
  border-top: 1px solid var(--uikit-border-color, #e5e7eb);
}

.nav-item {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--uikit-text-secondary, #6b7280);
  transition: background-color 0.15s, color 0.15s;
  padding: 0;
}

.nav-item:hover {
  background-color: var(--uikit-bg-base, rgba(0, 0, 0, 0.05));
  color: var(--uikit-text-primary, #111827);
}

.nav-item--active {
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  background-color: var(--uikit-bg-base, rgba(0, 0, 0, 0.05));
}

.nav-item__badge {
  display: inline-flex;
}

.nav-item__emoji {
  font-size: 18px;
  line-height: 1;
}
</style>
