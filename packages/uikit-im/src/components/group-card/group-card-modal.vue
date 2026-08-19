<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatSdkError } from '@easemob/uikit-core'
import { EmPopup as Popup } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import GroupCard, { type GroupCardInfoRow } from './group-card.vue'
import { createLogger } from '@easemob/uikit-core'

const logger = createLogger('UIKit:GroupCardModal')

export interface GroupCardModalProps {
  show: boolean
  groupId: string
}

const props = defineProps<GroupCardModalProps>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'send-message', groupId: string): void
  (e: 'close'): void
}>()

const { t } = useLocale()
const { stores } = useUIKit()
const { fetchGroupInfo } = useGroup()

const loading = ref(false)
/** 当前会话内已拉取失败的群 ID，避免空结果导致死循环 */
const fetchFailedIds = ref<Set<string>>(new Set())

const group = computed(() => stores.group.getGroupById(props.groupId))

watch(
  () => props.show,
  (show) => {
    if (show)
      void loadData()
  },
  { immediate: true },
)

async function loadData() {
  if (!props.groupId)
    return
  // 已有详情或正在加载或已失败则不再请求
  if (group.value?.groupName || loading.value || fetchFailedIds.value.has(props.groupId))
    return

  loading.value = true
  try {
    const info = await fetchGroupInfo(props.groupId)
    if (!info || !info.groupId) {
      fetchFailedIds.value.add(props.groupId)
    }
  }
  catch (err) {
    logger.warn('[GroupCardModal] fetchGroupInfo failed:', formatSdkError(err))
    fetchFailedIds.value.add(props.groupId)
  }
  finally {
    loading.value = false
  }
}

const cardActions = computed(() => {
  return [
    {
      key: 'message',
      label: t('groupCard.message', '消息'),
      icon: 'bubble/rect/empty',
      type: 'primary' as const,
    },
  ]
})

const cardInfoRows = computed<GroupCardInfoRow[]>(() => {
  const rows: GroupCardInfoRow[] = []
  const g = group.value

  if (g?.description)
    rows.push({ key: 'description', label: t('groupCard.description', '群介绍'), value: g.description })

  if (g?.memberCount !== undefined)
    rows.push({ key: 'memberCount', label: t('groupCard.memberCount', '成员数'), value: String(g.memberCount) })

  // 群 ID 已在 GroupCard 顶部固定展示并支持复制，infoRows 中不再重复
  return rows
})

const displayAvatar = computed(() => group.value?.avatar)
const displayName = computed(() => group.value?.groupName || props.groupId)

function onClose() {
  // Popup 的 close 事件已经携带了 update:show(false)，此处不再重复 emit，避免消费者收到两次
  emit('close')
}

function onActionClick(key: string) {
  if (key === 'message') {
    emit('send-message', props.groupId)
    onClose()
  }
}
</script>

<template>
  <Popup
    :show="props.show"
    position="center"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onClose"
  >
    <div class="group-card-modal">
      <GroupCard
        :group-id="props.groupId"
        :name="displayName"
        :avatar="displayAvatar"
        :actions="cardActions"
        :info-rows="cardInfoRows"
        @action-click="onActionClick"
      />

      <div v-if="loading" class="group-card-modal__loading">
        {{ t('common.loading', '加载中...') }}
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.group-card-modal {
  width: 320px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  /* 移动端优先使用动态视口高度，不支持的浏览器回退到上面的 100vh */
  max-height: calc(100dvh - 64px);
  overflow-y: auto;
}

.group-card-modal__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-14);
  border-radius: var(--uikit-components-radius, 12px);
}
</style>
