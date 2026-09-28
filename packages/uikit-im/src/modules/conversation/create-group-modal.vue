<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CONVERSATION_TYPE, EmCell as Cell, GROUP_INFO_LIMIT, EmInput as Input, EmSwitch as Switch, useLocale } from '@easemob-community/uikit-core'
import type { CreateGroupParams, UiContact } from '@easemob-community/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import { useContact } from '../../composables/use-contact'
import { useConversation } from '../../composables/use-conversation'
import ContactTransferModal from '../contact/contact-transfer-modal.vue'

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
  /** 打开弹窗时预选的成员 ID 列表（如单聊抽屉「添加」入口预选对方） */
  initialSelectedIds?: string[]
}

export interface CreateGroupModalProps {
  show: boolean
  config?: CreateGroupModalConfig
  /**
   * 自定义创建群函数：完全接管创建动作（可先登记自有业务系统，再调用 SDK 创建）。
   * 优先级高于 Provider 的 dataSource.createGroup（已翻译为 group.createGroup
   * repository 注入）；未配置时走 SDK 默认实现。
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

function formatCharCount(current: number, max: number): string {
  return t('common.charCount', '{current}/{max}').replace('{current}', String(current)).replace('{max}', String(max))
}

const { stores } = useUIKit()
const { createGroup } = useGroup()
const { contactList } = useContact()
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

/** 当前选中成员 id：打开时取 config.initialSelectedIds，之后由穿梭框 update:selectedIds 同步 */
const selectedIds = ref<string[]>([])

const selectedContacts = computed(() => {
  const map = new Map(contactList.value.map(c => [c.userId, c]))
  // 不在联系人列表中的预选 ID（如单聊抽屉「添加」入口的对方）以最小信息兜底展示，
  // 保证 initialSelectedIds 始终生效（与非好友也可发起群聊的语义一致）
  return selectedIds.value
    .map(id => map.get(id) ?? ({ userId: id, name: id } as UiContact))
    .filter(c => c.userId !== currentUserId.value)
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
  selectedIds.value = [...(props.config.initialSelectedIds ?? [])]
}

function onSelectedChange(ids: string[]) {
  selectedIds.value = ids
}

async function onCreate() {
  if (selectedCount.value === 0) {
    errorMsg.value = t('group.createNeedMember', '请至少选择一位成员')
    return
  }
  if (finalName.value.length > GROUP_INFO_LIMIT.NAME_MAX_LENGTH) {
    errorMsg.value = t('chat.info.groupNameTooLong').replace('{max}', String(GROUP_INFO_LIMIT.NAME_MAX_LENGTH))
    return
  }
  const desc = groupDescriptionInput.value.trim() || props.config.description || ''
  if (desc.length > GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH) {
    errorMsg.value = t('chat.info.groupDescriptionTooLong').replace('{max}', String(GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH))
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const memberIds = selectedContacts.value.map(c => c.userId)
    const params: CreateGroupParams = {
      name: finalName.value,
      description: desc,
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
  (show) => {
    if (show)
      reset()
  },
)
</script>

<template>
  <!-- 壳与选人结构收敛到共享穿梭框 EmContactTransferModal（D133）：
       EmModal 底座自带移动端 bottom sheet 回落，mobileFullscreen 全高档位拉满视口 -->
  <ContactTransferModal
    :show="props.show"
    :title="t('conversation.createGroup', '创建群组')"
    :selected-ids="props.config.initialSelectedIds ?? []"
    :disabled-fn="(contact: UiContact) => contact.userId === currentUserId"
    :confirm-text="t('group.createSubmit', '完成')"
    :loading="loading"
    @update:show="emit('update:show', $event)"
    @update:selected-ids="onSelectedChange"
    @confirm="onCreate"
  >
    <!-- #body 插槽：完全接管弹窗主体（透传宿主的同名接管） -->
    <template v-if="$slots.body" #body>
      <slot name="body" />
    </template>

    <!-- 群信息表单 + 群设置注入穿梭框右栏顶部（移动端渲染在头像条与列表之间） -->
    <template #panel-top>
      <div v-if="showNameInput || showDescriptionInput" class="create-group-modal__form">
        <div v-if="showNameInput" class="create-group-modal__field">
          <label class="create-group-modal__label">{{ t('group.createName', '群名称') }}</label>
          <Input
            v-model="groupNameInput"
            variant="default"
            :placeholder="generatedName || (t('group.createNamePlaceholder', '输入群名称'))"
            :maxlength="GROUP_INFO_LIMIT.NAME_MAX_LENGTH"
          />
          <div
            class="create-group-modal__char-count"
            :class="{ 'is-near-limit': groupNameInput.length > GROUP_INFO_LIMIT.NAME_MAX_LENGTH * 0.9 }"
          >
            {{ formatCharCount(groupNameInput.length, GROUP_INFO_LIMIT.NAME_MAX_LENGTH) }}
          </div>
        </div>
        <div v-if="showDescriptionInput" class="create-group-modal__field">
          <label class="create-group-modal__label">{{ t('group.createDescription', '群介绍') }}</label>
          <Input
            v-model="groupDescriptionInput"
            variant="default"
            :placeholder="t('group.createDescriptionPlaceholder', '输入群介绍（可选）')"
            :maxlength="GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH"
          />
          <div
            class="create-group-modal__char-count"
            :class="{ 'is-near-limit': groupDescriptionInput.length > GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH * 0.9 }"
          >
            {{ formatCharCount(groupDescriptionInput.length, GROUP_INFO_LIMIT.DESCRIPTION_MAX_LENGTH) }}
          </div>
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
            <Switch v-model="settings.public" @click.stop />
          </template>
        </Cell>
        <Cell size="compact" :border="false" @click="settings.joinApprovalRequired = !settings.joinApprovalRequired">
          <template #default>
            {{ t('group.createApproval', '入群需审批') }}
          </template>
          <template #trailing>
            <Switch v-model="settings.joinApprovalRequired" @click.stop />
          </template>
        </Cell>
        <Cell size="compact" :border="false" @click="settings.allowInvites = !settings.allowInvites">
          <template #default>
            {{ t('group.createAllowInvites', '允许成员邀请') }}
          </template>
          <template #trailing>
            <Switch v-model="settings.allowInvites" @click.stop />
          </template>
        </Cell>
        <Cell size="compact" :border="false" @click="settings.inviteNeedConfirm = !settings.inviteNeedConfirm">
          <template #default>
            {{ t('group.createInviteNeedConfirm', '被邀请人需确认') }}
          </template>
          <template #trailing>
            <Switch v-model="settings.inviteNeedConfirm" @click.stop />
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
    </template>

    <!-- 创建校验/接口错误提示（穿梭框 #notice 区，footer 上方） -->
    <template #notice>
      <div v-if="errorMsg" class="create-group-modal__error">
        {{ errorMsg }}
      </div>
    </template>

    <!-- #footer 插槽：接管操作区（透传宿主的同名接管） -->
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </ContactTransferModal>
</template>

<style scoped>
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
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.create-group-modal__char-count {
  align-self: flex-end;
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-tertiary);
  line-height: 1;
}

.create-group-modal__char-count.is-near-limit {
  color: var(--uikit-warning-color, var(--uikit-error-color, #f59e0b));
}

.create-group-modal__error {
  padding: 8px 16px;
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-danger-color);
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
  font-size: var(--uikit-font-size-12);
  font-weight: var(--uikit-font-weight-semibold);
  color: var(--uikit-text-secondary);
}

.create-group-modal__field--max-members {
  margin-top: 10px;
}
</style>
