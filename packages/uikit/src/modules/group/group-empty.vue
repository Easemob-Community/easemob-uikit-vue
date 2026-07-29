<script setup lang="ts">
import { useLocale } from '../../locale'
import Empty from '../../components/empty/empty.vue'

interface GroupEmptyProps {
  text?: string
}

const props = defineProps<GroupEmptyProps>()

const { t } = useLocale()
</script>

<template>
  <Empty icon="empty/group" :description="props.text || t('group.empty')" />
</template>
