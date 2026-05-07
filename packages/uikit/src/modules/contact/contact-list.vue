<script setup lang="ts">
import { useContact } from '../../composables/use-contact'
import { useLocale } from '../../locale'
import Avatar from '../../components/avatar/avatar.vue'

const { contactList } = useContact()
const { t } = useLocale()
</script>

<template>
  <div class="contact-list">
    <div class="contact-list__header">
      <span class="contact-list__title">{{ t('contact.title') }}</span>
    </div>
    <div class="contact-list__items">
      <div
        v-for="contact in contactList"
        :key="contact.userId"
        class="contact-list__item"
      >
        <Avatar :name="contact.name" :size="40" />
        <span class="contact-list__name">{{ contact.remark || contact.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.contact-list__header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.contact-list__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.contact-list__items {
  flex: 1;
  overflow-y: auto;
}

.contact-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.contact-list__item:active {
  background-color: var(--uikit-bg-secondary);
}

.contact-list__name {
  font-size: 14px;
  color: var(--uikit-text-primary);
}
</style>
