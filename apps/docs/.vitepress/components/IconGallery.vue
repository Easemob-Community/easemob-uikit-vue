<script setup lang="ts">
import { computed, ref } from 'vue'
import { getIconNames, getV2IconNames, getFilledIconNames } from '@easemob/uikit-core/components/icon/icon-map'
import EmIcon from '@easemob/uikit-core/components/icon/icon.vue'

const allNames = getIconNames()
const v2Names = getV2IconNames()
const filledNames = getFilledIconNames()
const legacyNames = allNames.filter(n => !v2Names.includes(n) && !filledNames.includes(n))

const query = ref('')
const copied = ref('')

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

function filterNames(names: string[]) {
  const q = query.value.trim().toLowerCase()
  if (!q)
    return names
  return names.filter(n => n.toLowerCase().includes(q))
}

const v2Grouped = computed(() => groupByCategory(filterNames(v2Names)))
const filledGrouped = computed(() => groupByCategory(filterNames(filledNames)))
const legacyGrouped = computed(() => groupByCategory(filterNames(legacyNames)))

async function copyName(name: string) {
  try {
    await navigator.clipboard.writeText(name)
    copied.value = name
    setTimeout(() => copied.value = '', 1200)
  }
  catch {
    // ignore
  }
}
</script>

<template>
  <div class="icon-gallery">
    <div class="icon-gallery__toolbar">
      <input
        v-model="query"
        class="icon-gallery__search"
        type="text"
        placeholder="搜索图标名称..."
      >
      <span class="icon-gallery__total">共 {{ allNames.length }} 个图标</span>
    </div>

    <template v-if="v2Grouped.length">
      <h2 class="icon-gallery__heading">
        线性图标（V2）
        <span class="icon-gallery__count">({{ filterNames(v2Names).length }})</span>
      </h2>
      <details v-for="[category, list] in v2Grouped" :key="category" class="icon-gallery__section" open>
        <summary :id="category" class="icon-gallery__title">
          {{ category }}
          <span class="icon-gallery__count">({{ list.length }})</span>
        </summary>
        <div class="icon-gallery__grid">
          <div
            v-for="name in list"
            :key="name"
            class="icon-gallery__item"
            :class="{ 'is-copied': copied === name }"
            :title="name"
            @click="copyName(name)"
          >
            <EmIcon :name="name" :size="24" />
            <code class="icon-gallery__name">{{ name }}</code>
            <span class="icon-gallery__copy">{{ copied === name ? '已复制' : '点击复制' }}</span>
          </div>
        </div>
      </details>
    </template>

    <template v-if="filledGrouped.length">
      <h2 class="icon-gallery__heading icon-gallery__heading--filled">
        面性图标（Filled）
        <span class="icon-gallery__count">({{ filterNames(filledNames).length }})</span>
      </h2>
      <details v-for="[category, list] in filledGrouped" :key="`filled-${category}`" class="icon-gallery__section" open>
        <summary :id="`filled-${category}`" class="icon-gallery__title">
          {{ category }}
          <span class="icon-gallery__count">({{ list.length }})</span>
        </summary>
        <div class="icon-gallery__grid">
          <div
            v-for="name in list"
            :key="name"
            class="icon-gallery__item"
            :class="{ 'is-copied': copied === name }"
            :title="name"
            @click="copyName(name)"
          >
            <EmIcon :name="name" :size="24" />
            <code class="icon-gallery__name">{{ name }}</code>
            <span class="icon-gallery__copy">{{ copied === name ? '已复制' : '点击复制' }}</span>
          </div>
        </div>
      </details>
    </template>

    <template v-if="legacyGrouped.length">
      <h2 class="icon-gallery__heading icon-gallery__heading--filled">
        旧版图标（Legacy）
        <span class="icon-gallery__count">({{ filterNames(legacyNames).length }})</span>
      </h2>
      <details v-for="[category, list] in legacyGrouped" :key="`legacy-${category}`" class="icon-gallery__section" open>
        <summary :id="`legacy-${category}`" class="icon-gallery__title">
          {{ category }}
          <span class="icon-gallery__count">({{ list.length }})</span>
        </summary>
        <div class="icon-gallery__grid">
          <div
            v-for="name in list"
            :key="name"
            class="icon-gallery__item"
            :class="{ 'is-copied': copied === name }"
            :title="name"
            @click="copyName(name)"
          >
            <EmIcon :name="name" :size="24" />
            <code class="icon-gallery__name">{{ name }}</code>
            <span class="icon-gallery__copy">{{ copied === name ? '已复制' : '点击复制' }}</span>
          </div>
        </div>
      </details>
    </template>

    <p v-if="!v2Grouped.length && !filledGrouped.length && !legacyGrouped.length" class="icon-gallery__empty">
      未找到匹配 "{{ query }}" 的图标
    </p>
  </div>
</template>

<style scoped>
.icon-gallery__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.icon-gallery__search {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
}

.icon-gallery__total {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.icon-gallery__heading {
  margin: 32px 0 16px;
  font-size: 20px;
  font-weight: 600;
}
.icon-gallery__heading--filled {
  margin-top: 48px;
}
.icon-gallery__section {
  margin: 12px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.icon-gallery__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 10px 14px;
  font-size: 15px;
  font-weight: 600;
  text-transform: capitalize;
  cursor: pointer;
  list-style: none;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  user-select: none;
}
.icon-gallery__title::-webkit-details-marker {
  display: none;
}
.icon-gallery__title::before {
  content: '▸';
  margin-right: 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s;
}
.icon-gallery__section[open] > .icon-gallery__title::before {
  transform: rotate(90deg);
}
.icon-gallery__section > .icon-gallery__grid {
  padding: 12px;
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
  gap: 4px;
  padding: 12px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: background-color 0.2s, border-color 0.2s;
  cursor: pointer;
}
.icon-gallery__item:hover,
.icon-gallery__item.is-copied {
  background-color: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand);
}
.icon-gallery__name {
  font-size: 11px;
  color: var(--vp-c-text-2);
  word-break: break-all;
  text-align: center;
}
.icon-gallery__copy {
  font-size: 10px;
  color: var(--vp-c-brand);
  opacity: 0;
  transition: opacity 0.2s;
}
.icon-gallery__item:hover .icon-gallery__copy,
.icon-gallery__item.is-copied .icon-gallery__copy {
  opacity: 1;
}
.icon-gallery__empty {
  margin-top: 24px;
  color: var(--vp-c-text-2);
  text-align: center;
}
</style>
