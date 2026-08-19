<script setup lang="ts">
import { EmSkeleton } from '@easemob/uikit-im'
</script>

<template>
  <div class="skeleton-demo">
    <div class="skeleton-demo__item">
      <span class="skeleton-demo__label">Text</span>
      <EmSkeleton variant="text" style="width: 200px;" />
    </div>
    <div class="skeleton-demo__item">
      <span class="skeleton-demo__label">Avatar</span>
      <EmSkeleton variant="avatar" />
    </div>
    <div class="skeleton-demo__item">
      <span class="skeleton-demo__label">Paragraph</span>
      <EmSkeleton variant="paragraph" :rows="4" style="width: 240px;" />
    </div>
    <div class="skeleton-demo__item">
      <span class="skeleton-demo__label">Card</span>
      <EmSkeleton variant="card" style="width: 280px;" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-demo__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-demo__label {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}
</style>
