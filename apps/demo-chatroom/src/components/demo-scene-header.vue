<script setup lang="ts">
/**
 * 场景页公共导航头：返回首页 + 场景标题 + 右侧插槽（在线人数/账号等）。
 * 五个变种页共用，保证导航一致性与移动端质感。
 */
defineProps<{
  /** 场景标题 */
  title: string
}>()

function goHome() {
  window.location.hash = '#/'
}
</script>

<template>
  <div class="scene-header">
    <button class="scene-header__back" aria-label="返回首页" @click="goHome">
      ‹
    </button>
    <span class="scene-header__title">{{ title }}</span>
    <div class="scene-header__extra">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scene-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px;
  flex-shrink: 0;
  background: var(--uikit-bg-panel, var(--uikit-bg-base, #fff));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

.scene-header__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
  border-radius: 8px;
}

.scene-header__back:active {
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
}

.scene-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.scene-header__extra {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
