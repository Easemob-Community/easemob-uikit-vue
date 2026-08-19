<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './icon.vue'
import { getV2IconNames } from './icon-map'

const v2Names = getV2IconNames()
const search = ref('')
const filteredNames = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? v2Names.filter(n => n.toLowerCase().includes(q)) : v2Names
})
</script>

<template>
  <Story title="Icon">
    <Variant title="Sizes">
      <div class="u-flex u-gap-4 u-items-center">
        <Icon name="check" :size="16">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Icon>
        <Icon name="check" :size="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Icon>
        <Icon name="check" :size="32">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Icon>
      </div>
    </Variant>
    <Variant title="Colors">
      <div class="u-flex u-gap-4">
        <Icon name="circle" color="#3b82f6">
          <circle cx="12" cy="12" r="10" />
        </Icon>
        <Icon name="square" color="#ef4444">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </Icon>
        <Icon name="triangle" color="#10b981">
          <polygon points="12 2 22 22 2 22" />
        </Icon>
      </div>
    </Variant>
    <Variant title="Animations">
      <div class="u-flex u-gap-6 u-items-center">
        <Icon name="loading/arc/normal" :size="32" anim="spin" />
        <Icon name="status/info" :size="32" anim="pulse" />
        <Icon name="bell/slash" :size="32" anim="shake" />
        <Icon name="triangle/exclamation" :size="32" anim="flash" />
      </div>
    </Variant>
    <Variant title="V2 icons">
      <div class="u-flex u-flex-col u-gap-4">
        <input
          v-model="search"
          placeholder="search icon name..."
          class="u-border u-rounded u-px-3 u-py-2"
        >
        <div class="icon-grid">
          <div v-for="name in filteredNames" :key="name" class="icon-grid__item">
            <Icon :name="name" :size="24" />
            <span class="icon-grid__name">{{ name }}</span>
          </div>
        </div>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.icon-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 8px;
}

.icon-grid__name {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  word-break: break-all;
  text-align: center;
}
</style>
