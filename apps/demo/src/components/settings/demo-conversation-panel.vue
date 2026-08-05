<script setup lang="ts">
/**
 * 设置面板 - 会话分栏
 *
 * 包含：EmConversationContainer / EmConversationList 分栏 tab 能力配置：
 * - 显隐开关（置空 tabs 数组隐藏 tab 栏）
 * - 自定义展示的 tab 按钮（如仅单聊 / 仅群组，不区分更多类型）
 * - 调整 tab 选项优先级（顺序即渲染优先级）
 * - 完全接管：#tabs 插槽 + useConversationTabs hook 自绘 tab 栏
 *
 * 状态来自 useDemoSettings，由 demo-page 绑定到 EmConversationContainer。
 */
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const {
  conversationTabs,
  conversationTabsVisible,
  conversationTabsTakeover,
  conversationActiveTab,
  conversationTabLabels,
  toggleConversationTab,
  moveConversationTab,
  presetConversationTabs,
} = useDemoSettings()
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">分栏显隐</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input v-model="conversationTabsVisible" type="checkbox">
          <span>展示会话分栏 tab 栏</span>
        </label>
      </div>
      <div class="demo-info">
        关闭后 tabs 数组置空，tab 栏整块隐藏；开启恢复原配置。
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">展示的 tab 按钮（可多选）</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label
          v-for="tab in ['all', 'unread', 'atMe', 'single', 'group'] as const"
          :key="tab"
          class="demo-check"
        >
          <input
            type="checkbox"
            :checked="conversationTabs.includes(tab)"
            @change="(e: Event) => toggleConversationTab(tab, (e.target as HTMLInputElement).checked)"
          >
          <span>{{ conversationTabLabels[tab] }}</span>
        </label>
      </div>
      <div class="demo-info">
        例如业务只有单聊或群聊，可只勾选「单聊」「群组」两个 tab。
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">选项优先级（顺序即渲染顺序）</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div
          v-for="(tab, index) in conversationTabs"
          :key="tab"
          style="display: flex; align-items: center; gap: 8px;"
        >
          <button
            class="demo-btn demo-btn--sm"
            :disabled="index === 0"
            @click="moveConversationTab(index, -1)"
          >
            ↑
          </button>
          <button
            class="demo-btn demo-btn--sm"
            :disabled="index === conversationTabs.length - 1"
            @click="moveConversationTab(index, 1)"
          >
            ↓
          </button>
          <span style="font-size: 13px; color: var(--uikit-text-primary, #111827);">
            {{ conversationTabLabels[tab] }}
          </span>
          <span
            v-if="conversationActiveTab === tab"
            style="font-size: 11px; color: var(--uikit-primary-color, #3b82f6);"
          >
            当前
          </span>
        </div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        <button class="demo-btn demo-btn--sm" @click="presetConversationTabs('single')">
          仅单聊
        </button>
        <button class="demo-btn demo-btn--sm" @click="presetConversationTabs('group')">
          仅群组
        </button>
        <button class="demo-btn demo-btn--sm" @click="presetConversationTabs('singleGroup')">
          单聊+群组
        </button>
        <button class="demo-btn demo-btn--sm" @click="presetConversationTabs('default')">
          恢复默认
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">完全接管渲染（#tabs 插槽）</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input v-model="conversationTabsTakeover" type="checkbox">
          <span>使用 #tabs 插槽自绘 tab 栏（下划线风格）</span>
        </label>
      </div>
      <div class="demo-info">
        演示 useConversationTabs hook + #tabs 插槽完全接管：demo-page 用 hook 持有
        tabs / activeTab / selectTab，插槽内自行渲染按钮。
      </div>
    </div>
  </div>
</template>
