<script setup lang="ts">
/**
 * Dev Hints 展示层（v2）
 *
 * 💡 角标（hover 目标右上角）+ EmPopup 右侧详情抽屉 +
 * 高亮边框 overlay（pointer-events: none 跟随命中容器）。
 * 根 class 统一 .demo-dev-hint，悬停引擎据此忽略覆盖层自身。
 */
import { computed, ref, watch } from 'vue'
import { EmIcon, EmPopup } from '@easemob/uikit-im'
import type { DevHintBadgeState, DevHintContext } from './types'

const props = defineProps<{
  badge: DevHintBadgeState | null
  highlightEl: HTMLElement | null
  detail: DevHintContext | null
}>()

const emit = defineEmits<{
  (e: 'open-detail', ctx: DevHintContext): void
  (e: 'close-detail'): void
}>()

/** 💡 角标样式：元素右上角外延 */
const badgeStyle = computed(() => {
  if (!props.badge)
    return {}
  return { left: `${props.badge.x}px`, top: `${props.badge.y}px` }
})

/** 高亮边框 rect（watch highlightEl 变化 + resize 同步） */
const highlightRect = ref<DOMRect | null>(null)
watch(
  () => props.highlightEl,
  (el) => {
    highlightRect.value = el ? el.getBoundingClientRect() : null
  },
  { immediate: true },
)
const highlightStyle = computed(() => {
  if (!highlightRect.value)
    return {}
  const r = highlightRect.value
  return {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  }
})
</script>

<template>
  <!-- 高亮边框 overlay（pointer-events: none，不干扰鼠标事件） -->
  <div
    v-if="highlightEl"
    class="demo-dev-hint demo-dev-hint__highlight"
    :style="highlightStyle"
  />

  <!-- 💡 角标 -->
  <button
    v-if="badge"
    type="button"
    class="demo-dev-hint demo-dev-hint__badge"
    :style="badgeStyle"
    :title="`${badge.entry.title} · 点击查看实现详情`"
    @click.stop="emit('open-detail', { entry: badge.entry })"
  >
    💡
  </button>

  <!-- 详情抽屉 -->
  <EmPopup
    :show="!!detail"
    position="right"
    :overlay="false"
    @update:show="(v: boolean) => { if (!v) emit('close-detail') }"
  >
    <div v-if="detail" class="demo-dev-hint__drawer">
      <div class="demo-dev-hint__drawer-header">
        <span class="demo-dev-hint__drawer-title">💡 {{ detail.entry.title }}</span>
        <button
          type="button"
          class="demo-dev-hint__drawer-close"
          @click="emit('close-detail')"
        >
          <EmIcon name="actions/close" :size="16" />
        </button>
      </div>

      <div class="demo-dev-hint__drawer-body">
        <p class="demo-dev-hint__drawer-summary">{{ detail.entry.summary }}</p>

        <section class="demo-dev-hint__section">
          <h4 class="demo-dev-hint__section-title">环信接口（easemob-websdk 5.x）</h4>
          <ul class="demo-dev-hint__api-list">
            <li v-for="api in detail.entry.apis" :key="api.name" class="demo-dev-hint__api-item">
              <code class="demo-dev-hint__api-name">{{ api.name }}</code>
              <p class="demo-dev-hint__api-note">{{ api.note }}</p>
              <p v-if="!api.docUrl" class="demo-dev-hint__api-doc">官方文档即将上线 · 权威签名见 SDK 包内 types/*.d.ts</p>
            </li>
          </ul>
        </section>

        <section class="demo-dev-hint__section">
          <h4 class="demo-dev-hint__section-title">UIKit 实现思路</h4>
          <ol class="demo-dev-hint__notes">
            <li v-for="(note, i) in detail.entry.implNotes" :key="i" class="demo-dev-hint__note">
              {{ note }}
            </li>
          </ol>
        </section>

        <section class="demo-dev-hint__section">
          <h4 class="demo-dev-hint__section-title">参考文件</h4>
          <ul class="demo-dev-hint__refs">
            <li v-for="ref in detail.entry.refs" :key="ref.path" class="demo-dev-hint__ref">
              <code class="demo-dev-hint__ref-path">{{ ref.path }}</code>
              <p class="demo-dev-hint__ref-desc">{{ ref.desc }}</p>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </EmPopup>
</template>

<style scoped>
/* ===== 高亮边框 overlay ===== */
.demo-dev-hint__highlight {
  position: fixed;
  z-index: 2999;
  border: 2px solid hsl(203, 100%, 60%);
  border-radius: 8px;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
  animation: demo-dev-hint-highlight-in 0.3s ease;
}

@keyframes demo-dev-hint-highlight-in {
  from {
    opacity: 0;
    border-color: hsl(203, 100%, 80%);
  }
  to {
    opacity: 1;
    border-color: hsl(203, 100%, 60%);
  }
}

/* ===== 💡 角标 ===== */
.demo-dev-hint__badge {
  position: fixed;
  z-index: 3000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transform: translate(0, -50%);
  animation: demo-dev-hint-badge-in 0.2s ease;
}

.demo-dev-hint__badge:hover {
  transform: translate(0, -50%) scale(1.1);
  border-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

@keyframes demo-dev-hint-badge-in {
  from {
    opacity: 0;
    transform: translate(0, -50%) scale(0.6);
  }
  to {
    opacity: 1;
    transform: translate(0, -50%) scale(1);
  }
}

/* ===== 详情抽屉 ===== */
.demo-dev-hint__drawer {
  display: flex;
  flex-direction: column;
  width: 420px;
  height: 100%;
  background: var(--uikit-bg-base, #ffffff);
}

.demo-dev-hint__drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  flex-shrink: 0;
}

.demo-dev-hint__drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.demo-dev-hint__drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--uikit-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
}

.demo-dev-hint__drawer-close:hover {
  background: var(--uikit-bg-secondary, #f3f4f6);
  color: var(--uikit-text-primary, #111827);
}

.demo-dev-hint__drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.demo-dev-hint__drawer-summary {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.demo-dev-hint__section {
  margin-bottom: 20px;
}

.demo-dev-hint__section-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--uikit-bg-secondary, #e5e7eb);
}

.demo-dev-hint__api-list,
.demo-dev-hint__refs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demo-dev-hint__api-item {
  padding: 8px 10px;
  border: 1px solid var(--uikit-bg-secondary, #e5e7eb);
  border-radius: 8px;
}

.demo-dev-hint__api-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.5;
}

.demo-dev-hint__api-doc {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

.demo-dev-hint__notes {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-dev-hint__note {
  font-size: 12px;
  color: var(--uikit-text-primary, #111827);
  line-height: 1.6;
}

.demo-dev-hint__ref {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--uikit-bg-secondary, #f3f4f6);
}

.demo-dev-hint__ref-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: hsl(203, 100%, 40%);
  word-break: break-all;
}

.demo-dev-hint__ref-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
}

/* H5 抽屉宽度适配 */
@media (max-width: 767px) {
  .demo-dev-hint__drawer {
    width: 100vw;
  }
}
</style>
