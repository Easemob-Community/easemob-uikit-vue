<script setup lang="ts">
/**
 * Demo 设置抽屉（分类导航外壳）
 *
 * 交互：PC 为右侧抽屉「左侧分类导航 + 右侧面板内容」；H5 为底部抽屉「顶部横向分类 tab + 内容」。
 * 6 个分类对应 6 个独立面板组件，切换只换内容区，面板状态由 useDemoSettings 单例持有，不丢失。
 * Provider 四开关由 app.vue 持有，经本组件 props/emits 双向转发到各面板。
 */
import { ref } from 'vue'
import { EmIcon, EmPopup } from '@easemob/uikit'
import DemoAppearancePanel from './demo-appearance-panel.vue'
import DemoChatPanel from './demo-chat-panel.vue'
import DemoContactPanel from './demo-contact-panel.vue'
import DemoConversationPanel from './demo-conversation-panel.vue'
import DemoDataPanel from './demo-data-panel.vue'
import DemoProviderPanel from './demo-provider-panel.vue'
import DemoSdkPanel from './demo-sdk-panel.vue'

interface Props {
  /** 抽屉显隐（v-model） */
  show: boolean
  /** 是否移动端（影响弹出方向与导航形态） */
  isMobile: boolean
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  useCustomDataSource: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
  (e: 'update:enableContact', v: boolean): void
  (e: 'update:enableBlocklist', v: boolean): void
  (e: 'update:enablePresence', v: boolean): void
  (e: 'update:useCustomDataSource', v: boolean): void
  (e: 'logout'): void
}>()

/** 分类定义：key 与面板组件一一对应 */
const categories = [
  { key: 'appearance', label: '外观', icon: 'misc/gear' },
  { key: 'conversation', label: '会话', icon: 'chat/pin' },
  { key: 'chat', label: '聊天', icon: 'chat/bubble_fill' },
  { key: 'contact', label: '通讯录', icon: 'people/person_3lines_fill' },
  { key: 'data', label: '演示数据', icon: 'files-media/archives' },
  { key: 'provider', label: 'Provider', icon: 'actions/shield' },
  { key: 'sdk', label: 'SDK 登录', icon: 'actions/unlock' },
] as const

type CategoryKey = typeof categories[number]['key']

const activeCategory = ref<CategoryKey>('appearance')

function close() {
  emit('update:show', false)
}
</script>

<template>
  <EmPopup
    :show="props.show"
    :position="props.isMobile ? 'bottom' : 'right'"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <div class="demo-drawer">
      <div class="demo-drawer__header">
        <span class="demo-drawer__title">设置</span>
        <button class="demo-btn demo-btn--icon" @click="close">✕</button>
      </div>

      <!-- PC：左侧分类导航 + 右侧内容 -->
      <div v-if="!props.isMobile" class="demo-drawer__body demo-drawer__body--split">
        <nav class="demo-drawer__nav">
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            class="demo-nav-item"
            :class="{ 'demo-nav-item--active': activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            <EmIcon :name="cat.icon" :size="18" />
            <span>{{ cat.label }}</span>
          </button>
        </nav>
        <div class="demo-drawer__content">
          <DemoAppearancePanel v-if="activeCategory === 'appearance'" />
          <DemoConversationPanel v-else-if="activeCategory === 'conversation'" />
          <DemoChatPanel v-else-if="activeCategory === 'chat'" />
          <DemoContactPanel v-else-if="activeCategory === 'contact'" />
          <DemoDataPanel v-else-if="activeCategory === 'data'" />
          <DemoProviderPanel
            v-else-if="activeCategory === 'provider'"
            :enable-contact="props.enableContact"
            :enable-blocklist="props.enableBlocklist"
            :enable-presence="props.enablePresence"
            :use-custom-data-source="props.useCustomDataSource"
            @update:enable-contact="(v: boolean) => emit('update:enableContact', v)"
            @update:enable-blocklist="(v: boolean) => emit('update:enableBlocklist', v)"
            @update:enable-presence="(v: boolean) => emit('update:enablePresence', v)"
            @update:use-custom-data-source="(v: boolean) => emit('update:useCustomDataSource', v)"
          />
          <DemoSdkPanel v-else @logout="emit('logout')" />
        </div>
      </div>

      <!-- H5：顶部横向分类 tab + 内容 -->
      <div v-else class="demo-drawer__body">
        <nav class="demo-drawer__tabs">
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            class="demo-tab-item"
            :class="{ 'demo-tab-item--active': activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            <EmIcon :name="cat.icon" :size="16" />
            <span>{{ cat.label }}</span>
          </button>
        </nav>
        <div class="demo-drawer__content">
          <DemoAppearancePanel v-if="activeCategory === 'appearance'" />
          <DemoConversationPanel v-else-if="activeCategory === 'conversation'" />
          <DemoChatPanel v-else-if="activeCategory === 'chat'" />
          <DemoContactPanel v-else-if="activeCategory === 'contact'" />
          <DemoDataPanel v-else-if="activeCategory === 'data'" />
          <DemoProviderPanel
            v-else-if="activeCategory === 'provider'"
            :enable-contact="props.enableContact"
            :enable-blocklist="props.enableBlocklist"
            :enable-presence="props.enablePresence"
            :use-custom-data-source="props.useCustomDataSource"
            @update:enable-contact="(v: boolean) => emit('update:enableContact', v)"
            @update:enable-blocklist="(v: boolean) => emit('update:enableBlocklist', v)"
            @update:enable-presence="(v: boolean) => emit('update:enablePresence', v)"
            @update:use-custom-data-source="(v: boolean) => emit('update:useCustomDataSource', v)"
          />
          <DemoSdkPanel v-else @logout="emit('logout')" />
        </div>
      </div>
    </div>
  </EmPopup>
</template>

<style scoped>
.demo-btn--icon {
  width: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn--icon:hover {
  opacity: 0.85;
}

.demo-drawer {
  width: 420px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base, #ffffff);
}

.demo-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  flex-shrink: 0;
}

.demo-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.demo-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* PC：左右分栏 */
.demo-drawer__body--split {
  flex-direction: row;
  padding: 0;
  overflow: hidden;
}

.demo-drawer__nav {
  width: 104px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 8px;
  border-right: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  overflow-y: auto;
}

.demo-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--uikit-text-secondary, #6b7280);
  font-size: 13px;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
  white-space: nowrap;
}

.demo-nav-item:hover {
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
}

.demo-nav-item--active {
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  font-weight: 600;
}

/* H5：顶部横向 tab */
.demo-drawer__tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  flex-shrink: 0;
}

.demo-tab-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 16px;
  background: transparent;
  color: var(--uikit-text-secondary, #6b7280);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.demo-tab-item--active {
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
  color: #ffffff;
}

/* 内容区：面板组件共享的滚动容器 */
.demo-drawer__content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px;
}

/* H5 抽屉宽度适配 */
@media (max-width: 767px) {
  .demo-drawer {
    width: 100vw;
    max-height: 80vh;
    border-radius: 12px 12px 0 0;
  }

  .demo-drawer__content {
    padding: 12px;
  }
}
</style>
