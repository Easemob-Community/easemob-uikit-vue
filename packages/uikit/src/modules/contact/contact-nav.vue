<script setup lang="ts">
import Icon from '../../components/icon/icon.vue'
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
          <span class="contact-nav__item-label">
            <Icon
              v-if="entry.icon"
              :name="entry.icon"
              :size="20"
              class="contact-nav__item-icon"
            />
            <span>{{ entry.label }}</span>
          </span>
          <span class="contact-nav__item-extra">
            <slot name="entry-extra" :entry="entry">
              <span
                v-if="entry.count !== undefined && entry.count !== null && entry.count > 0"
                class="contact-nav__item-count"
                :class="{ 'contact-nav__item-count--hot': entry.hot }"
              >
                {{ entry.count > 99 ? '99+' : entry.count }}
              </span>
            </slot>
            <Icon
              name="navigation/chevron_right"
              :size="14"
              class="contact-nav__item-arrow"
            />
          </span>
        </slot>
      </div>
    </template>
  </div>
</template>

<style scoped>
.contact-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
}

.contact-nav__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 14px;
  height: 56px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  cursor: pointer;
  transition: background-color 0.15s, transform 0.15s;
  user-select: none;
}

.contact-nav__item:hover {
  background-color: var(--uikit-bg-hover);
}

.contact-nav__item:active {
  transform: scale(0.99);
}

.contact-nav__item-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  flex: 1;
  min-width: 0;
}

.contact-nav__item-icon {
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.contact-nav__item-extra {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--uikit-text-secondary);
  font-size: 13px;
  flex-shrink: 0;
}

.contact-nav__item-count {
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

.contact-nav__item-count--hot {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background-color: #ef4444;
  border-radius: 9px;
}

.contact-nav__item-arrow {
  color: var(--uikit-text-tertiary, var(--uikit-text-secondary));
}
</style>
