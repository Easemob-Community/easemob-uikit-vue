<script setup lang="ts">
import { useLocale } from '@easemob-community/uikit-core'
import { EmEmpty as Empty } from '@easemob-community/uikit-core'

interface ContactEmptyProps {
  text?: string
}

const props = defineProps<ContactEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <Empty icon="person/single" :description="props.text || t('contact.empty')" />
</template>
