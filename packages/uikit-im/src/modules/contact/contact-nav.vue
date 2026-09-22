<script setup lang="ts">
import { EmCell as Cell, EmIcon as Icon } from '@easemob-community/uikit-core'
import type { ContactNavEntry } from './types'

export type { ContactNavEntry }

interface ContactNavProps {
  /** 入口配置列表，按数组顺序展示 */
  entries: ContactNavEntry[]
  /** 单卡附加 class */
  cardClass?: string
  /** 单卡附加 style */
  cardStyle?: Record<string, string>
}

const props = withDefaults(defineProps<ContactNavProps>(), {})

const emit = defineEmits<{
  (e: 'entry-click', key: string): void
}>()

function onEntryClick(entry: ContactNavEntry) {
  emit('entry-click', entry.key)
}

function hasCount(entry: ContactNavEntry) {
  return entry.count !== undefined && entry.count !== null && entry.count > 0
}

/** 标题文本：计数内联，如「联系人 (332)」 */
function entryTitle(entry: ContactNavEntry) {
  return hasCount(entry) ? `${entry.label} (${entry.count})` : entry.label
}
</script>

<template>
  <div class="contact-nav">
    <template v-for="entry in props.entries" :key="entry.key">
      <div
        v-if="entry.visible !== false"
        class="contact-nav__item"
        :class="props.cardClass"
        :style="props.cardStyle"
        @click="onEntryClick(entry)"
      >
        <slot name="entry" :entry="entry">
          <Cell class="contact-nav__cell" :inset-hover="false">
            <template v-if="entry.icon" #leading>
              <Icon
                :name="entry.icon"
                :size="20"
                class="contact-nav__item-icon"
              />
            </template>
            <template #title>
              <span class="contact-nav__item-title">
                <span class="contact-nav__item-label">{{ entryTitle(entry) }}</span>
                <span
                  v-if="entry.hot && hasCount(entry)"
                  class="contact-nav__item-dot"
                />
              </span>
            </template>
            <template #trailing>
              <slot name="entry-extra" :entry="entry" />
              <Icon
                name="chevron/right"
                :size="22"
                class="contact-nav__item-arrow"
              />
            </template>
          </Cell>
        </slot>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 与会话列表 card 变体同一口径：圆角白卡、行间距 4px、容器内边距 4px */
.contact-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  --uikit-cell-gap: 0px;
  --uikit-item-hover-radius: 8px;
  --uikit-item-active-radius: 8px;
}

.contact-nav__item {
  min-width: 0;
  cursor: pointer;
}

.contact-nav__item-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-primary);
}

.contact-nav__item-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.contact-nav__item-icon {
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

/* 未读红点：8×8，规格见 docs/DESIGN-TOKEN-MAPPING.md */
.contact-nav__item-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background-color: var(--uikit-badge-bg);
}

/* 与 Cell 自带箭头同规格：22px 图标 + 4px padding，负 margin 抵消占位 */
.contact-nav__item-arrow {
  padding: 4px;
  margin: -4px;
  flex-shrink: 0;
  color: var(--uikit-icon-muted);
}
</style>
