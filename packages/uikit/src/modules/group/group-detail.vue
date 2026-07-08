<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UiGroup } from '../../sdk/types'
import GroupCard from '../../components/group-card/group-card.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'

export interface GroupDetailProps {
  /** 群 ID */
  groupId: string
  /** 外部已缓存的群摘要（可选，用于首屏快速展示） */
  group?: UiGroup | null
}

const props = withDefaults(defineProps<GroupDetailProps>(), {
  group: null,
})

const emit = defineEmits<{
  (e: 'send-message', groupId: string): void
}>()

const { t } = useLocale()
const { stores } = useUIKit()
const { fetchGroupInfo } = useGroup()

const loading = ref(false)
/** 当前会话内已拉取失败的群 ID，避免空结果导致死循环 */
const fetchFailedIds = ref<Set<string>>(new Set())

const groupFromStore = computed(() => stores.group.getGroupById(props.groupId))

watch(
  () => props.groupId,
  () => {
    void loadData()
  },
  { immediate: true },
)

async function loadData() {
  if (!props.groupId)
    return
  // 列表数据不一定含 role，必须 fetchGroupInfo 补齐后才能跳过
  if ((groupFromStore.value?.groupName && groupFromStore.value?.role) || loading.value || fetchFailedIds.value.has(props.groupId))
    return

  loading.value = true
  try {
    const info = await fetchGroupInfo(props.groupId)
    if (!info || !info.groupId)
      fetchFailedIds.value.add(props.groupId)
  }
  catch (err) {
    console.warn('[GroupDetail] fetchGroupInfo failed:', err)
    fetchFailedIds.value.add(props.groupId)
  }
  finally {
    loading.value = false
  }
}

const displayGroup = computed<UiGroup | undefined>(() => {
  return groupFromStore.value || props.group || undefined
})

const displayAvatar = computed(() => displayGroup.value?.avatar)
const displayName = computed(() => displayGroup.value?.groupName || props.groupId)

const cardActions = computed(() => {
  return [
    {
      key: 'message',
      label: t('contact.detail.sendMessage') || '发消息',
      icon: 'chat/bubble_fill',
      type: 'primary' as const,
    },
  ]
})

const cardInfoRows = computed(() => {
  const rows: { key: string, label: string, value: string }[] = []
  const g = displayGroup.value

  if (g?.description)
    rows.push({ key: 'description', label: t('groupCard.description') || '群介绍', value: g.description })

  if (g?.memberCount !== undefined)
    rows.push({ key: 'memberCount', label: t('groupCard.memberCount') || '成员数', value: String(g.memberCount) })

  rows.push({ key: 'groupId', label: t('groupCard.groupId') || '群 ID', value: props.groupId })

  return rows
})

function onCardAction(key: string) {
  if (key === 'message')
    emit('send-message', props.groupId)
}
</script>

<template>
  <div class="group-detail">
    <div class="group-detail__wrapper">
      <div v-if="loading" class="group-detail__loading">
        {{ t('common.loading') || '加载中...' }}
      </div>

      <GroupCard
        :group-id="props.groupId"
        :name="displayName"
        :avatar="displayAvatar"
        :actions="cardActions"
        :info-rows="cardInfoRows"
        @action-click="onCardAction"
      />
    </div>
  </div>
</template>

<style scoped>
.group-detail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  overflow-y: auto;
}

.group-detail__wrapper {
  position: relative;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-detail__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  color: var(--uikit-text-secondary);
  font-size: 14px;
  border-radius: var(--uikit-components-radius, 12px);
  z-index: 1;
}
</style>
