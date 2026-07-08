<script setup lang="ts">
import { useLocale } from '../../locale'

interface GroupEmptyProps {
  text?: string
}

const props = defineProps<GroupEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <div class="group-empty">
    <slot>
      <span class="group-empty__text">{{ props.text || t('group.empty') }}</span>
    </slot>
  </div>
</template>

<style scoped>
.group-empty {
  padding: 40px 16px;
  text-align: center;
}

.group-empty__text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
</style>
