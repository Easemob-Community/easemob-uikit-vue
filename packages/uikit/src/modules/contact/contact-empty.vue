<script setup lang="ts">
import { useLocale } from '../../locale'

interface ContactEmptyProps {
  text?: string
}

const props = defineProps<ContactEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <div class="contact-empty">
    <slot>
      <span class="contact-empty__text">{{ props.text || t('contact.empty') }}</span>
    </slot>
  </div>
</template>

<style scoped>
.contact-empty {
  padding: 40px 16px;
  text-align: center;
}

.contact-empty__text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
</style>
