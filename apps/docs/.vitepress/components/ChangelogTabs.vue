<script setup lang="ts">
import { ref } from 'vue'

interface Tab {
  id: string
  label: string
}

const tabs: Tab[] = [
  { id: 'im', label: '@easemob/uikit-im' },
  { id: 'core', label: '@easemob/uikit-core' },
  { id: 'chatroom', label: '@easemob/uikit-chatroom' },
]

const active = ref('im')
</script>

<template>
  <div class="changelog-tabs">
    <div class="changelog-tabs__nav" role="tablist">
      <button
        v-for="tab in tabs"
        :id="`changelog-tab-${tab.id}`"
        :key="tab.id"
        class="changelog-tabs__tab"
        :class="{ 'is-active': active === tab.id }"
        role="tab"
        :aria-selected="active === tab.id"
        :aria-controls="`changelog-panel-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        @click="active = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="changelog-tabs__panels">
      <div
        v-for="tab in tabs"
        :id="`changelog-panel-${tab.id}`"
        :key="tab.id"
        class="changelog-tabs__panel"
        :class="{ 'is-active': active === tab.id }"
        role="tabpanel"
        :aria-labelledby="`changelog-tab-${tab.id}`"
      >
        <slot :name="tab.id" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.changelog-tabs__nav {
  display: flex;
  gap: 4px;
  margin: 16px 0 24px;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
}

.changelog-tabs__tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.changelog-tabs__tab:hover {
  color: var(--vp-c-text-1);
}

.changelog-tabs__tab.is-active {
  background-color: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.changelog-tabs__panel {
  display: none;
}

.changelog-tabs__panel.is-active {
  display: block;
}

@media (max-width: 640px) {
  .changelog-tabs__tab {
    padding: 8px;
    font-size: 12px;
  }
}
</style>
