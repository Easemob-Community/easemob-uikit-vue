<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useContact } from '../../composables/use-contact'
import { useViewport } from '../../composables/use-viewport'
import Popup from '../../components/popup/popup.vue'
import Button from '../../components/button/button.vue'
import ContactList from '../contact/contact-list.vue'
import type { UiContact } from '../../sdk/types'

export interface InviteMemberModalProps {
  show: boolean
  groupId: string
  /** 已加入群的用户 ID 列表，用于禁用 */
  existingMemberIds?: string[]
}

export interface InviteMemberModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'invited', userIds: string[]): void
}

const props = defineProps<InviteMemberModalProps>()
const emit = defineEmits<InviteMemberModalEmits>()

const { t } = useLocale()
const { stores } = useUIKit()
const { isMobile } = useViewport()
const { selectedIds, setSelectedIds, fetchContacts } = useContact()

const loading = ref(false)

const currentUserId = computed(() => stores.client.currentUser)

function disabledFn(contact: UiContact): boolean {
  const userId = contact.userId
  if (userId === currentUserId.value)
    return true
  return props.existingMemberIds?.includes(userId) ?? false
}

function onClose() {
  emit('update:show', false)
}

function onCancel() {
  onClose()
}

async function onInvite() {
  const ids = [...selectedIds.value]
  if (ids.length === 0)
    return
  loading.value = true
  try {
    emit('invited', ids)
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (show) => {
    if (show) {
      setSelectedIds([])
      await fetchContacts()
    }
  },
)
</script>

<template>
  <Popup
    :show="props.show"
    :position="isMobile ? 'bottom' : 'center'"
    :show-close="true"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <div class="invite-member-modal" :class="{ 'invite-member-modal--mobile': isMobile }">
      <div class="invite-member-modal__header">
        <span class="invite-member-modal__title">{{ t('group.inviteMember.title', '添加成员') }}</span>
        <span v-if="selectedIds.size > 0" class="invite-member-modal__count">({{ selectedIds.size }})</span>
      </div>

      <div class="invite-member-modal__list">
        <ContactList
          :show-header="false"
          :show-scroll-to-top="false"
          :show-alphabet-nav="false"
          group-by="none"
          select-mode="multiple"
          :disabled-fn="disabledFn"
        />
      </div>

      <div class="invite-member-modal__footer">
        <Button type="default" @click="onCancel">
          {{ t('button.cancel', '取消') }}
        </Button>
        <Button type="primary" :disabled="selectedIds.size === 0" :loading="loading" @click="onInvite">
          {{ t('group.inviteMember.invite', '邀请') }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.invite-member-modal {
  width: 400px;
  max-width: 90vw;
  height: 60vh;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
}

.invite-member-modal--mobile {
  width: 100vw;
  max-width: 100vw;
  height: 80vh;
  max-height: 80vh;
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
}

.invite-member-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  flex-shrink: 0;
}

.invite-member-modal__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.invite-member-modal__count {
  margin-left: 6px;
  font-size: var(--uikit-font-size-14);
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.invite-member-modal__list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.invite-member-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-shrink: 0;
}
</style>
