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
import { useClientStore, useConversationStore, useMessageStore } from '@easemob/uikit'
import { useDemoSettings } from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const clientStore = useClientStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()

const {
  statusBannerEnabled,
  conversationTabs,
  conversationTabsVisible,
  conversationTabsTakeover,
  conversationActiveTab,
  conversationTabLabels,
  toggleConversationTab,
  moveConversationTab,
  presetConversationTabs,
} = useDemoSettings()

/** 模拟状态：仅供 UI 验证，不触发真实 SDK 事件 */
function simulateNetworkError() {
  clientStore.setConnected(false)
  clientStore.setConnecting(false)
  conversationStore.setSyncingConversations(false)
  messageStore.setSyncingMessages(false)
}

function simulateConnecting() {
  clientStore.setConnected(false)
  clientStore.setConnecting(true)
  conversationStore.setSyncingConversations(false)
  messageStore.setSyncingMessages(false)
}

function simulateSyncingConversations() {
  clientStore.setConnected(true)
  clientStore.setConnecting(false)
  conversationStore.setSyncingConversations(true)
  messageStore.setSyncingMessages(false)
}

function simulateSyncingMessages() {
  clientStore.setConnected(true)
  clientStore.setConnecting(false)
  conversationStore.setSyncingConversations(false)
  messageStore.setSyncingMessages(true)
}

function restoreStatus() {
  clientStore.setConnected(true)
  clientStore.setConnecting(false)
  conversationStore.setSyncingConversations(false)
  messageStore.setSyncingMessages(false)
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="状态横幅"
        tip="会话列表顶部的连接 / 同步状态横幅，按 断网 > 连接中 > 会话同步 > 消息同步 的优先级展示"
      />
      <label class="demo-check">
        <input v-model="statusBannerEnabled" type="checkbox">
        <span>展示连接/同步状态横幅</span>
      </label>
      <div class="demo-info">
        横幅按优先级展示：断网 > 连接中 > 会话同步中 > 消息同步中。
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        <button class="demo-btn demo-btn--sm" @click="simulateNetworkError">模拟断网</button>
        <button class="demo-btn demo-btn--sm" @click="simulateConnecting">模拟连接中</button>
        <button class="demo-btn demo-btn--sm" @click="simulateSyncingConversations">模拟会话同步</button>
        <button class="demo-btn demo-btn--sm" @click="simulateSyncingMessages">模拟消息同步</button>
        <button class="demo-btn demo-btn--sm" @click="restoreStatus">恢复</button>
      </div>
      <div class="demo-info" style="color: var(--uikit-warning-color, #f59e0b);">
        注意：模拟按钮仅修改 UI 状态，不会真实断开 SDK 连接。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="分栏显隐"
        tip="会话分栏 tab 栏整体显隐：关闭后 tabs 数组置空、tab 栏整块隐藏，开启恢复原配置"
      />
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
      <DemoSettingLabel
        title="展示的 tab 按钮（可多选）"
        tip="自定义会话分栏展示哪些 tab（全部 / 未读 / @我 / 单聊 / 群组）。如业务只有单聊和群聊，可只勾选这两项"
      />
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
      <DemoSettingLabel
        title="tab 顺序（↑↓ 调整渲染顺序）"
        tip="调整 tab 的渲染顺序，顺序即 tab 栏的显示顺序"
      />
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
      <DemoSettingLabel
        title="完全接管渲染（#tabs 插槽）"
        tip="用 useConversationTabs hook + #tabs 插槽完全自绘 tab 栏（演示下划线风格），业务可自由定制"
      />
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
