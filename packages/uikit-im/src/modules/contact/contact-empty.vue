<script setup lang="ts">
import { useLocale } from '../../locale'
import Empty from '../../components/empty/empty.vue'

interface ContactEmptyProps {
  text?: string
}

const props = defineProps<ContactEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <Empty icon="empty/contact" :description="props.text || t('contact.empty')" />
</template>
