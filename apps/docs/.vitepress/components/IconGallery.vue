<script setup lang="ts">
import { computed } from 'vue'
import { getIconNames } from '@easemob/uikit-im/components/icon/icon-map'
import EmIcon from '@easemob/uikit-im/components/icon/icon.vue'

const names = getIconNames()

const grouped = computed(() => {
  const map = new Map<string, string[]>()
  for (const name of names) {
    const category = name.split('/')[0] || 'uncategorized'
    if (!map.has(category))
      map.set(category, [])
    map.get(category)!.push(name)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div class="icon-gallery">
    <section v-for="[category, list] in grouped" :key="category" class="icon-gallery__section">
      <h3 :id="category" class="icon-gallery__title">
        {{ category }}
        <span class="icon-gallery__count">({{ list.length }})</span>
      </h3>
      <div class="icon-gallery__grid">
        <div v-for="name in list" :key="name" class="icon-gallery__item" :title="name">
          <EmIcon :name="name" :size="24" />
          <code class="icon-gallery__name">{{ name }}</code>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.icon-gallery__section {
  margin: 24px 0;
}
.icon-gallery__title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  text-transform: capitalize;
}
.icon-gallery__count {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}
.icon-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}
.icon-gallery__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: background-color 0.2s;
}
.icon-gallery__item:hover {
  background-color: var(--vp-c-bg-soft);
}
.icon-gallery__name {
  font-size: 11px;
  color: var(--vp-c-text-2);
  word-break: break-all;
  text-align: center;
}
</style>
