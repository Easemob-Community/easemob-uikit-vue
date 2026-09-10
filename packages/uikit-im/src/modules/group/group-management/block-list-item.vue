<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar as Avatar, EmCell as Cell, EmIconButton as IconButton, useLocale } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'

export interface BlockListItemProps {
  item: any
  /** 分隔线（透传 EmCell border 能力），默认无；会话详情抽屉分栏页传 'bottom' */
  border?: boolean | 'top' | 'bottom'
}

const props = defineProps<BlockListItemProps>()

const emit = defineEmits<{
  (e: 'unblock'): void
}>()

const { t } = useLocale()

const userId = computed(() => {
  const user = props.item.user || props.item
  return user?.userId || ''
})

const { displayName, avatarUrl } = useUserInfo(userId)
</script>

<template>
  <Cell
    class="block-list__item"
    :title="displayName"
    :clickable="false"
    :border="props.border"
  >
    <template #leading>
      <!-- 头像尺寸与「全部/管理员」分栏成员行一致（40） -->
      <Avatar :name="displayName" :src="avatarUrl" :size="40" />
    </template>
    <template #trailing>
      <IconButton
        icon="person/minus"
        variant="ghost"
        :title="t('group.memberList.unblock', '移出黑名单')"
        @click.stop="emit('unblock')"
      />
    </template>
  </Cell>
</template>

<style scoped>
.block-list__item {
  --uikit-item-hover-padding-x: 16px;
}
</style>
