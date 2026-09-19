<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { EmButton as Button, CONVERSATION_TYPE, EmCell as Cell, EmEmpty as Empty, GROUP_INFO_LIMIT, EmIcon as Icon, EmInput as Input, EmPopup as Popup, EmSwitch as Switch, useLocale, useViewport } from '@easemob/uikit-core'
import type { CreateGroupParams, UiContact } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import { useContact } from '../../composables/use-contact'
import { useConversation } from '../../composables/use-conversation'
import ContactList from '../contact/contact-list.vue'
import ContactItemDefault from '../contact/contact-item-default.vue'

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
  // 不在联系人列表中的预选 ID（如单聊抽屉「添加」入口的对方）以最小信息兜底展示，
  // 保证 initialSelectedIds 始终生效（与非好友也可发起群聊的语义一致）
  return ids
    .map(id => map.get(id) ?? ({ userId: id, name: id } as UiContact))
    .filter(c => c.userId !== currentUserId.value)
})

const selectedCount = computed(() => selectedContacts.value.length)

/** 右栏已选列表搜索关键词（本地过滤，不写入 store） */
const selectedSearchKeyword = ref('')
const filteredSelectedContacts = computed(() => {
  const kw = selectedSearchKeyword.value.trim().toLowerCase()
  if (!kw)
    return selectedContacts.value
  return selectedContacts.value.filter(c =>
    (c.remark || c.name || c.userId).toLowerCase().includes(kw),
  )
})

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
  selectedSearchKeyword.value = ''
  settings.public = props.config.public ?? false
  settings.joinApprovalRequired = props.config.joinApprovalRequired ?? false
  settings.allowInvites = props.config.allowInvites ?? false
  settings.inviteNeedConfirm = props.config.inviteNeedConfirm ?? false
  settings.maxMembers = props.config.maxMembers ? String(props.config.maxMembers) : ''
  setSelectedIds(props.config.initialSelectedIds ?? [])
}

function removeSelected(userId: string) {
  toggleSelect(userId)
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
            group-by="alphabet"
            select-mode="multiple"
            checkbox-position="right"
            :disabled-fn="(contact) => contact.userId === currentUserId"
          />
        </div>

        <!-- 右侧：已选 + 群信息 -->
        <div class="create-group-modal__right">
          <div class="create-group-modal__right-search">
            <Input
              v-model="selectedSearchKeyword"
              variant="search"
              clearable
              clear-icon="search/xmark"
              :placeholder="t('contact.searchPlaceholder')"
              prefix-icon="search"
            />
          </div>

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

          <div class="create-group-modal__selected-list">
            <ContactItemDefault
              v-for="contact in filteredSelectedContacts"
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
                  <Icon name="filled/circle/xmark" :size="20" />
                </button>
              </template>
            </ContactItemDefault>
            <Empty
              v-if="selectedCount === 0"
              icon="person/single"
              :description="t('group.createSelectedEmpty', '请选择联系人')"
              size="small"
            />
            <Empty
              v-else-if="filteredSelectedContacts.length === 0"
              icon="person/single"
              :description="t('contact.noSearchResult')"
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
        <Button
          class="create-group-modal__footer-btn"
          type="primary"
          size="large"
          pill
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="onCreate"
        >
          {{ t('group.createSubmit', '完成') }}
        </Button>
        <Button class="create-group-modal__footer-btn" type="outline" size="large" pill @click="onClose">
          {{ t('button.cancel', '取消') }}
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
  justify-content: flex-start;
  padding: 16px;
  flex-shrink: 0;
  /* 底部分隔线宽度随全局 headerBorder 开关（默认 0 关闭） */
  border-bottom: var(--uikit-header-border-width, 0px) solid var(--uikit-border-color, #e5e7eb);
}

.create-group-modal__title {
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-semibold);
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

/* 左栏列表对齐设计稿：分组头无底色、行间发丝线、行尾选择框避开字母导航 */
.create-group-modal__left :deep(.contact-list__search) {
  padding: 12px 16px 8px;
}
.create-group-modal__left :deep(.contact-list__group-header) {
  background-color: transparent;
}

.create-group-modal__left :deep(.contact-item) {
  margin-bottom: 0;
}

/* 行尾选择框右缘到分割线之间预留字母索引条通道（40px），
   索引条居中于通道内（right: 11px ≈ (40-18)/2），与选择框、分割线两侧都留出间距。
   选择器需带上 .uikit-cell：scoped CSS 属性选择器计特异性，单类 deep 覆盖与
   EmCell 的 .uikit-cell.is-auto-height padding 简写同为 (0,3,0)，构建产物中
   core 样式注入靠后会回写 padding-right 导致通道失效（索引条与选择框重叠） */
.create-group-modal__left :deep(.uikit-cell.contact-item-default) {
  padding-right: 40px;
}

.create-group-modal__left :deep(.contact-alphabet-nav) {
  right: 11px;
}

/* 行间发丝线左内收：从名字起点开始（避开头像列），与设计稿一致 */
.create-group-modal__left :deep(.contact-item-default)::after {
  content: '';
  position: absolute;
  left: calc(var(--uikit-item-hover-padding-x, 16px) + 48px + var(--uikit-spacing-3, 12px));
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.create-group-modal__right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
}

.create-group-modal__right-search {
  padding: 12px 16px 8px;
  flex-shrink: 0;
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

.create-group-modal__selected-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.create-group-modal__selected-item {
  --uikit-item-hover-padding-x: 8px;
}

/* 已选行发丝线同样左内收避开头像列 */
.create-group-modal__selected-item::after {
  content: '';
  position: absolute;
  left: calc(var(--uikit-item-hover-padding-x, 8px) + 48px + var(--uikit-spacing-3, 12px));
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.create-group-modal__selected-remove {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--uikit-text-tertiary);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

@media (hover: hover) {
  .create-group-modal__selected-remove:hover {
    color: var(--uikit-danger-color);
  }
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

.create-group-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-shrink: 0;
  background-color: var(--uikit-bg-base);
}

.create-group-modal__footer-btn {
  min-width: 104px;
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
