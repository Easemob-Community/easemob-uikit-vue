<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { EmEmpty as Empty, GROUP_MEMBER_ROLE, EmInput as Input, useLocale } from '@easemob/uikit-core'
import type { GroupMemberRoleValue, UiGroupMember } from '@easemob/uikit-core'
import GroupMemberListItem from '../../group/group-member-list-item.vue'

export interface ChatInfoDrawerMemberSearchProps {
  /** 群 ID */
  groupId: string
  /** 群成员列表（抽屉注入的群成员缓存） */
  members: UiGroupMember[]
  /** 当前登录用户 ID */
  currentUserId: string
  /** 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许 */
  allowChat?: 'all' | 'contact' | 'none'
}

const props = withDefaults(defineProps<ChatInfoDrawerMemberSearchProps>(), {
  allowChat: 'all',
})

const emit = defineEmits<{
  (e: 'chat-member', member: UiGroupMember): void
  (e: 'remove-member', member: UiGroupMember): void
  (e: 'set-admin', member: UiGroupMember): void
  (e: 'remove-admin', member: UiGroupMember): void
  (e: 'mute-member', member: UiGroupMember): void
  (e: 'unmute-member', member: UiGroupMember): void
  (e: 'block-member', member: UiGroupMember): void
  (e: 'unblock-member', member: UiGroupMember): void
  (e: 'transfer-owner', member: UiGroupMember): void
}>()

const { t } = useLocale()

const keyword = ref('')
const searchInputRef = ref<InstanceType<typeof Input>>()

const currentUserRole = computed<GroupMemberRoleValue>(() => {
  const member = props.members.find(m => m.userId === props.currentUserId)
  return (member?.role as GroupMemberRoleValue | undefined) || GROUP_MEMBER_ROLE.MEMBER
})

/** 前端过滤：nickname || userId 小写 includes（同 group-member-list）；未输入时显示全部成员 */
const filteredMembers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw)
    return props.members
  return props.members.filter((m) => {
    const name = (m.nickname || m.userId).toLowerCase()
    return name.includes(kw)
  })
})

onMounted(async () => {
  await nextTick()
  searchInputRef.value?.inputRef?.focus()
})
</script>

<template>
  <div class="chat-info-drawer-member-search">
    <div class="chat-info-drawer-member-search__search">
      <Input
        ref="searchInputRef"
        v-model="keyword"
        variant="search"
        pill
        clearable
        clear-icon="search/xmark"
        :placeholder="t('group.memberList.searchPlaceholder', '搜索群成员')"
        prefix-icon="search"
      />
    </div>

    <div class="chat-info-drawer-member-search__items">
      <Empty
        v-if="filteredMembers.length === 0"
        icon="search"
        :description="t('chat.info.noSearchResult', '暂无结果')"
        size="small"
      />
      <GroupMemberListItem
        v-for="member in filteredMembers"
        :key="member.userId"
        :member="member"
        :group-id="props.groupId"
        :current-user-id="props.currentUserId"
        :current-user-role="currentUserRole"
        :highlight="keyword.trim()"
        :show-id="false"
        border="bottom"
        :show-mute-action="true"
        :show-block-action="true"
        :show-admin-action="true"
        :show-remove-action="true"
        :show-chat-action="true"
        :allow-chat="props.allowChat"
        @chat-member="emit('chat-member', $event)"
        @remove-member="emit('remove-member', $event)"
        @set-admin="emit('set-admin', $event)"
        @remove-admin="emit('remove-admin', $event)"
        @mute-member="emit('mute-member', $event)"
        @unmute-member="emit('unmute-member', $event)"
        @block-member="emit('block-member', $event)"
        @unblock-member="emit('unblock-member', $event)"
        @transfer-owner="emit('transfer-owner', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-info-drawer-member-search {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat-info-drawer-member-search__search {
  padding: 8px 16px;
  flex-shrink: 0;
}

.chat-info-drawer-member-search__items {
  flex: 1;
  min-height: 0;
}
</style>
