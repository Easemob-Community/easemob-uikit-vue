<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useViewport } from '../../composables/use-viewport'
import { useGroup } from '../../composables/use-group'
import { useContact } from '../../composables/use-contact'
import { useConversation } from '../../composables/use-conversation'
import Popup from '../../components/popup/popup.vue'
import Input from '../../components/input/input.vue'
import Button from '../../components/button/button.vue'
import ContactList from '../contact/contact-list.vue'
import ContactItemDefault from '../contact/contact-item-default.vue'
import Cell from '../../components/cell/cell.vue'
import Empty from '../../components/empty/empty.vue'
import type { UiContact } from '../../sdk/types'

export interface CreateGroupModalConfig {
  /** 群名称；不传时自动生成 */
  name?: string
  /** 群描述 */
  description?: string
  /** 是否为公开群，默认 false */
  public?: boolean
  /** 入群是否需要管理员审批，默认 false */
  joinApprovalRequired?: boolean
  /** 是否允许普通成员邀请其他用户入群，默认 false */
  allowInvites?: boolean
  /** 被邀请人入群前是否需要确认邀请，默认 false */
  inviteNeedConfirm?: boolean
  /** 群组最大成员数 */
  maxMembers?: number
  /** 是否显示群名称输入框（默认 false，由代码层配置 name） */
  showNameInput?: boolean
  /** 是否显示群描述输入框（默认 false，由代码层配置 description） */
  showDescriptionInput?: boolean
  /**
   * 未提供 name 时是否根据选中成员自动生成群名，默认 true。
   * 自动生成规则：取前 3 个成员昵称 + "..."（成员数 > 3 时）。
   */
  autoName?: boolean
}

export interface CreateGroupModalProps {
  show: boolean
  config?: CreateGroupModalConfig
}

export interface CreateGroupModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'created', groupId: string): void
}

const props = withDefaults(defineProps<CreateGroupModalProps>(), {
  config: () => ({}),
})
const emit = defineEmits<CreateGroupModalEmits>()

const { t } = useLocale()
const { isMobile } = useViewport()
const { stores } = useUIKit()
const { createGroup } = useGroup()
const { contactList, selectedIds, setSelectedIds, toggleSelect, fetchContacts } = useContact()
const { selectConversation } = useConversation()

const loading = ref(false)
const errorMsg = ref('')
const groupNameInput = ref('')
const groupDescriptionInput = ref('')

const currentUserId = computed(() => stores.client.currentUser)
const showNameInput = computed(() => props.config.showNameInput === true)
const showDescriptionInput = computed(() => props.config.showDescriptionInput === true)
const autoName = computed(() => props.config.autoName !== false)

const selectedContacts = computed(() => {
  const ids = [...selectedIds.value]
  const map = new Map(contactList.value.map(c => [c.userId, c]))
  return ids.map(id => map.get(id)).filter((c): c is UiContact => !!c && c.userId !== currentUserId.value)
})

const selectedCount = computed(() => selectedContacts.value.length)

const generatedName = computed(() => {
  if (props.config.name)
    return props.config.name
  if (!autoName.value)
    return ''
  const names = selectedContacts.value.slice(0, 3).map(c => c.name || c.userId)
  if (selectedCount.value > 3)
    names.push('...')
  return names.join('、') || (t('group.createDefaultName') || '群聊')
})

const finalName = computed(() => groupNameInput.value.trim() || generatedName.value)

function onClose() {
  emit('update:show', false)
}

function reset() {
  loading.value = false
  errorMsg.value = ''
  groupNameInput.value = ''
  groupDescriptionInput.value = ''
  setSelectedIds([])
}

function removeSelected(userId: string) {
  toggleSelect(userId)
}

async function onCreate() {
  if (selectedCount.value === 0) {
    errorMsg.value = t('group.createNeedMember') || '请至少选择一位成员'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const memberIds = selectedContacts.value.map(c => c.userId)
    const result = await createGroup({
      name: finalName.value,
      description: groupDescriptionInput.value.trim() || props.config.description || '',
      memberIds,
      public: props.config.public ?? false,
      joinApprovalRequired: props.config.joinApprovalRequired ?? false,
      allowInvites: props.config.allowInvites ?? false,
      inviteNeedConfirm: props.config.inviteNeedConfirm ?? false,
      maxMembers: props.config.maxMembers,
    })
    const groupId = result.groupId

    stores.conversation.addConversation({
      id: groupId,
      name: finalName.value,
      type: 'groupChat',
      unreadCount: 0,
      lastMessageText: '',
      isPinned: false,
      isMuted: false,
      marks: [],
    })
    selectConversation(groupId)
    emit('created', groupId)
    onClose()
  }
  catch (err) {
    errorMsg.value = (err as Error).message || (t('group.createFailed') || '创建群组失败')
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (show) => {
    if (show) {
      reset()
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
    <div class="create-group-modal" :class="{ 'create-group-modal--mobile': isMobile }">
      <div class="create-group-modal__header">
        <span class="create-group-modal__title">{{ t('conversation.createGroup') || '创建群组' }}</span>
      </div>

      <div class="create-group-modal__body">
        <!-- 左侧：联系人选择 -->
        <div class="create-group-modal__left">
          <ContactList
            :show-header="false"
            :show-scroll-to-top="false"
            :show-alphabet-nav="false"
            group-by="alphabet"
            select-mode="multiple"
            :disabled-fn="(contact) => contact.userId === currentUserId"
          />
        </div>

        <!-- 右侧：已选 + 群信息 -->
        <div class="create-group-modal__right">
          <div class="create-group-modal__right-header">
            <span class="create-group-modal__right-title">
              {{ t('group.createSelectedTitle') || '已选择的联系人' }}
            </span>
            <span class="create-group-modal__right-count">
              {{ t('group.createSelectedPrefix') || '已选择' }} {{ selectedCount }} {{ t('group.createSelectedUnit') || '人' }}
            </span>
          </div>

          <div v-if="showNameInput || showDescriptionInput" class="create-group-modal__form">
            <div v-if="showNameInput" class="create-group-modal__field">
              <label class="create-group-modal__label">{{ t('group.createName') || '群名称' }}</label>
              <Input
                v-model="groupNameInput"
                variant="default"
                :placeholder="generatedName || (t('group.createNamePlaceholder') || '输入群名称')"
              />
            </div>
            <div v-if="showDescriptionInput" class="create-group-modal__field">
              <label class="create-group-modal__label">{{ t('group.createDescription') || '群介绍' }}</label>
              <Input
                v-model="groupDescriptionInput"
                variant="default"
                :placeholder="t('group.createDescriptionPlaceholder') || '输入群介绍（可选）'"
              />
            </div>
          </div>

          <div class="create-group-modal__selected-list">
            <ContactItemDefault
              v-for="contact in selectedContacts"
              :key="contact.userId"
              class="create-group-modal__selected-item"
              :contact="contact"
              size="normal"
              :show-checkbox="false"
              :clickable="false"
            >
              <template #extra>
                <button
                  class="create-group-modal__selected-remove"
                  @click="removeSelected(contact.userId)"
                >
                  <span>×</span>
                </button>
              </template>
            </ContactItemDefault>
            <Empty
              v-if="selectedCount === 0"
              icon="empty/contact"
              :description="t('group.createSelectedEmpty') || '请选择联系人'"
              size="small"
            />
          </div>
        </div>
      </div>

      <div v-if="errorMsg" class="create-group-modal__error">
        {{ errorMsg }}
      </div>

      <div class="create-group-modal__footer">
        <Button type="default" @click="onClose">
          {{ t('button.cancel') || '取消' }}
        </Button>
        <Button
          type="primary"
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="onCreate"
        >
          {{ t('group.createSubmit') || '完成' }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.create-group-modal {
  width: 720px;
  max-width: 90vw;
  height: 70vh;
  max-height: 620px;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
}

.create-group-modal--mobile {
  width: 100vw;
  max-width: 100vw;
  height: 85vh;
  max-height: 85vh;
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
}

.create-group-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
}

.create-group-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.create-group-modal__body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.create-group-modal__left {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--uikit-border-color, #e5e7eb);
  overflow: hidden;
}

.create-group-modal__right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-secondary, #f9fafb);
}

.create-group-modal__right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
}

.create-group-modal__right-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.create-group-modal__right-count {
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

.create-group-modal__form {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
}

.create-group-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.create-group-modal__label {
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

.create-group-modal__selected-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.create-group-modal__selected-item {
  --uikit-item-hover-padding-x: 8px;
}

.create-group-modal__selected-remove {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background-color: var(--uikit-bg-secondary, #e5e7eb);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

.create-group-modal__selected-remove:hover {
  background-color: var(--uikit-danger-color, #ef4444);
  color: #fff;
}

.create-group-modal__error {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--uikit-danger-color, #ef4444);
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  flex-shrink: 0;
  text-align: center;
}

.create-group-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
  background-color: var(--uikit-bg-base);
}

@media (max-width: 640px) {
  .create-group-modal__body {
    flex-direction: column;
  }

  .create-group-modal__left {
    border-right: none;
    border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
    flex: 1.5;
  }

  .create-group-modal__right {
    width: 100%;
    flex: 1;
  }
}
</style>
