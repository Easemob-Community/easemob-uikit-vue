<script setup lang="ts">
import { useLocale } from '@easemob/uikit-core'
import { EmEmpty as Empty } from '@easemob/uikit-core'

interface ContactEmptyProps {
  text?: string
}

const props = defineProps<ContactEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <Empty icon="empty/contact" :description="props.text || t('contact.empty')" />
</template>
