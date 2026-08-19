<script setup lang="ts">
import { computed } from 'vue'
import { getV2IconNames, getFilledIconNames } from '@easemob/uikit-core/components/icon/icon-map'
import EmIcon from '@easemob/uikit-core/components/icon/icon.vue'

const v2Names = getV2IconNames()
const filledNames = getFilledIconNames()

function groupByCategory(names: string[]) {
  const map = new Map<string, string[]>()
  for (const name of names) {
    const category = name.split('/')[0] || 'uncategorized'
    if (!map.has(category))
      map.set(category, [])
    map.get(category)!.push(name)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

const v2Grouped = computed(() => groupByCategory(v2Names))
const filledGrouped = computed(() => groupByCategory(filledNames))
</script>

<template>
  <div class="icon-gallery">
    <h2 class="icon-gallery__heading">
      线性图标（V2）
      <span class="icon-gallery__count">({{ v2Names.length }})</span>
    </h2>
    <section v-for="[category, list] in v2Grouped" :key="category" class="icon-gallery__section">
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

    <h2 class="icon-gallery__heading icon-gallery__heading--filled">
      面性图标（Filled）
      <span class="icon-gallery__count">({{ filledNames.length }})</span>
    </h2>
    <section v-for="[category, list] in filledGrouped" :key="`filled-${category}`" class="icon-gallery__section">
      <h3 :id="`filled-${category}`" class="icon-gallery__title">
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
.icon-gallery__heading {
  margin: 32px 0 16px;
  font-size: 20px;
  font-weight: 600;
}
.icon-gallery__heading--filled {
  margin-top: 48px;
}
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
