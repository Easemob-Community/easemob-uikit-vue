<script setup lang="ts">
import { useLocale } from '@easemob/uikit-core'
import { EmEmpty as Empty } from '@easemob/uikit-core'

interface GroupEmptyProps {
  text?: string
}

const props = defineProps<GroupEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <Empty icon="empty/group" :description="props.text || t('group.empty')" />
</template>
