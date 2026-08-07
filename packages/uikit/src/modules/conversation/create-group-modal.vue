<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import { CONVERSATION_TYPE } from '../../constants'
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
import type { CreateGroupParams, UiContact } from '../../sdk/types'

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
  /** 是否在弹窗内显示“群设置”区（公开/审批/邀请开关、最大成员数），默认 false */
  showSettings?: boolean
}

export interface CreateGroupModalProps {
  show: boolean
  config?: CreateGroupModalConfig
  /**
   * 自定义创建群函数：完全接管创建动作（可先登记自有业务系统，再调用 SDK 创建）。
   * 优先级高于 Provider 的 dataSource.createGroup；未配置时走 SDK 默认实现。
   * Custom create: fully take over the create-group action.
   */
  createFn?: (params: CreateGroupParams) => Promise<{ groupId: string }>
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
const showSettings = computed(() => props.config.showSettings === true)

/** 群设置开关状态（初值取 config，弹窗内可调整） */
const settings = reactive({
  public: false,
  joinApprovalRequired: false,
  allowInvites: false,
  inviteNeedConfirm: false,
  maxMembers: '',
})

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
  return names.join('、') || (t('group.createDefaultName', '群聊'))
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
  settings.public = props.config.public ?? false
  settings.joinApprovalRequired = props.config.joinApprovalRequired ?? false
  settings.allowInvites = props.config.allowInvites ?? false
  settings.inviteNeedConfirm = props.config.inviteNeedConfirm ?? false
  settings.maxMembers = props.config.maxMembers ? String(props.config.maxMembers) : ''
  setSelectedIds([])
}

function removeSelected(userId: string) {
  toggleSelect(userId)
}

async function onCreate() {
  if (selectedCount.value === 0) {
    errorMsg.value = t('group.createNeedMember', '请至少选择一位成员')
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const memberIds = selectedContacts.value.map(c => c.userId)
    const params: CreateGroupParams = {
      name: finalName.value,
      description: groupDescriptionInput.value.trim() || props.config.description || '',
      memberIds,
      public: settings.public,
      joinApprovalRequired: settings.joinApprovalRequired,
      allowInvites: settings.allowInvites,
      inviteNeedConfirm: settings.inviteNeedConfirm,
      maxMembers: settings.maxMembers ? Number(settings.maxMembers) : undefined,
    }
    // 提交链路：props.createFn → dataSource.createGroup → SDK 默认
    const result = props.createFn
      ? await props.createFn(params)
      : await createGroup(params)
    const groupId = result.groupId

    stores.conversation.addConversation({
      id: groupId,
      name: finalName.value,
      type: CONVERSATION_TYPE.GROUPCHAT,
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
    errorMsg.value = (err as Error).message || (t('group.createFailed', '创建群组失败'))
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
        <span class="create-group-modal__title">{{ t('conversation.createGroup', '创建群组') }}</span>
      </div>

      <div v-if="$slots.body" class="create-group-modal__body">
        <slot name="body" />
      </div>
      <div v-else class="create-group-modal__body">
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
              {{ t('group.createSelectedTitle', '已选择的联系人') }}
            </span>
            <span class="create-group-modal__right-count">
              {{ t('group.createSelectedPrefix', '已选择') }} {{ selectedCount }} {{ t('group.createSelectedUnit', '人') }}
            </span>
          </div>

          <div v-if="showNameInput || showDescriptionInput" class="create-group-modal__form">
            <div v-if="showNameInput" class="create-group-modal__field">
              <label class="create-group-modal__label">{{ t('group.createName', '群名称') }}</label>
              <Input
                v-model="groupNameInput"
                variant="default"
                :placeholder="generatedName || (t('group.createNamePlaceholder', '输入群名称'))"
              />
            </div>
            <div v-if="showDescriptionInput" class="create-group-modal__field">
              <label class="create-group-modal__label">{{ t('group.createDescription', '群介绍') }}</label>
              <Input
                v-model="groupDescriptionInput"
                variant="default"
                :placeholder="t('group.createDescriptionPlaceholder', '输入群介绍（可选）')"
              />
            </div>
          </div>

          <!-- 群设置：公开/审批/邀请开关 + 最大成员数（config.showSettings 开启） -->
          <div v-if="showSettings" class="create-group-modal__settings">
            <div class="create-group-modal__settings-title">
              {{ t('group.createSettings', '群设置') }}
            </div>
            <Cell size="compact" :border="false" @click="settings.public = !settings.public">
              <template #default>
                {{ t('group.createPublic', '公开群') }}
              </template>
              <template #trailing>
                <span class="create-group-modal__switch" :class="{ 'is-on': settings.public }"><i /></span>
              </template>
            </Cell>
            <Cell size="compact" :border="false" @click="settings.joinApprovalRequired = !settings.joinApprovalRequired">
              <template #default>
                {{ t('group.createApproval', '入群需审批') }}
              </template>
              <template #trailing>
                <span class="create-group-modal__switch" :class="{ 'is-on': settings.joinApprovalRequired }"><i /></span>
              </template>
            </Cell>
            <Cell size="compact" :border="false" @click="settings.allowInvites = !settings.allowInvites">
              <template #default>
                {{ t('group.createAllowInvites', '允许成员邀请') }}
              </template>
              <template #trailing>
                <span class="create-group-modal__switch" :class="{ 'is-on': settings.allowInvites }"><i /></span>
              </template>
            </Cell>
            <Cell size="compact" :border="false" @click="settings.inviteNeedConfirm = !settings.inviteNeedConfirm">
              <template #default>
                {{ t('group.createInviteNeedConfirm', '被邀请人需确认') }}
              </template>
              <template #trailing>
                <span class="create-group-modal__switch" :class="{ 'is-on': settings.inviteNeedConfirm }"><i /></span>
              </template>
            </Cell>
            <div class="create-group-modal__field create-group-modal__field--max-members">
              <label class="create-group-modal__label">{{ t('group.createMaxMembers', '最大成员数') }}</label>
              <Input
                v-model="settings.maxMembers"
                type="number"
                variant="default"
                :placeholder="t('group.createMaxMembersPlaceholder', '不填则使用默认上限')"
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
              :description="t('group.createSelectedEmpty', '请选择联系人')"
              size="small"
            />
          </div>
        </div>
      </div>

      <div v-if="errorMsg" class="create-group-modal__error">
        {{ errorMsg }}
      </div>

      <!-- #footer 插槽：接管操作区 -->
      <div v-if="$slots.footer" class="create-group-modal__footer">
        <slot name="footer" />
      </div>
      <div v-else class="create-group-modal__footer">
        <Button type="default" @click="onClose">
          {{ t('button.cancel', '取消') }}
        </Button>
        <Button
          type="primary"
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="onCreate"
        >
          {{ t('group.createSubmit', '完成') }}
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
  flex-shrink: 0;
}

.create-group-modal__title {
  font-size: var(--uikit-font-size-16);
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
  flex-shrink: 0;
}

.create-group-modal__right-title {
  font-size: var(--uikit-font-size-14);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.create-group-modal__right-count {
  font-size: var(--uikit-font-size-13);
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
  font-size: var(--uikit-font-size-13);
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
  font-size: var(--uikit-font-size-14);
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

@media (hover: hover) {
  .create-group-modal__selected-remove:hover {
    background-color: var(--uikit-danger-color, #ef4444);
    color: #fff;
  }
}

.create-group-modal__error {
  padding: 8px 16px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-danger-color, #ef4444);
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  flex-shrink: 0;
  text-align: center;
}

.create-group-modal__settings {
  padding: 4px 16px 12px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 240px;
}

.create-group-modal__settings-title {
  padding: 8px 0 4px;
  font-size: var(--uikit-font-size-13);
  font-weight: 600;
  color: var(--uikit-text-secondary);
}

.create-group-modal__field--max-members {
  margin-top: 10px;
}

.create-group-modal__switch {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background-color: var(--uikit-bg-strong, #e5e7eb);
  position: relative;
  transition: background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  flex-shrink: 0;
  cursor: pointer;
}

.create-group-modal__switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff;
  transition: transform var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

.create-group-modal__switch.is-on {
  background-color: var(--uikit-primary-color);
}

.create-group-modal__switch.is-on i {
  transform: translateX(16px);
}

.create-group-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
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
