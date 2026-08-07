<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useViewport } from '../../composables/use-viewport'
import { useContact } from '../../composables/use-contact'
import type { UiContact } from '../../sdk/types'
import Popup from '../../components/popup/popup.vue'
import Input from '../../components/input/input.vue'
import Button from '../../components/button/button.vue'
import Cell from '../../components/cell/cell.vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'

export interface AddContactModalProps {
  show: boolean
  /**
   * 自定义搜索函数：关键字（手机号/邮箱/昵称等业务字段）→ 候选用户列表。
   * 优先级高于 Provider 的 dataSource.searchUsers；未配置时退化为直接输入用户 ID 添加。
   * Custom search: map business fields (phone/email/...) to Easemob userId candidates.
   */
  searchFn?: (keyword: string) => Promise<UiContact[]>
  /**
   * 自定义添加函数：完全接管“添加好友”动作（可先登记自有业务系统，再调用 SDK 添加）。
   * 优先级高于 dataSource.addContact；未配置时走 SDK 默认实现。
   * Custom add: fully take over the add-contact action.
   */
  addFn?: (userId: string, message?: string) => Promise<void>
}

export interface AddContactModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'added', userId: string): void
  /** 发起搜索时通知关键字 */
  (e: 'search', keyword: string): void
}

const props = defineProps<AddContactModalProps>()
const emit = defineEmits<AddContactModalEmits>()

const { t } = useLocale()
const { isMobile } = useViewport()
const { stores, dataSource } = useUIKit()
const { addContact, searchUsers } = useContact()

const keyword = ref('')
const userId = ref('')
const reason = ref('')
const loading = ref(false)
const searching = ref(false)
const searchResults = ref<UiContact[]>([])
const searched = ref(false)
const selectedUserId = ref('')
const errorMsg = ref('')

const currentUserId = computed(() => stores.client.currentUser)
const canSubmit = computed(() => userId.value.trim() && !loading.value)
/** 搜索模式：配置了 searchFn 或 dataSource.searchUsers 时启用 */
const searchable = computed(() => !!props.searchFn || !!dataSource.searchUsers)

function onClose() {
  emit('update:show', false)
}

function reset() {
  keyword.value = ''
  userId.value = ''
  reason.value = ''
  errorMsg.value = ''
  loading.value = false
  searching.value = false
  searchResults.value = []
  searched.value = false
  selectedUserId.value = ''
}

/** 发起搜索（searchFn 优先，回落 dataSource.searchUsers） */
async function onSearch() {
  const kw = keyword.value.trim()
  if (!kw || searching.value)
    return
  searching.value = true
  errorMsg.value = ''
  emit('search', kw)
  try {
    searchResults.value = props.searchFn
      ? await props.searchFn(kw)
      : await searchUsers(kw)
    searched.value = true
  }
  catch (err) {
    searchResults.value = []
    searched.value = true
    errorMsg.value = (err as Error).message || (t('contact.searchFailed', '搜索失败'))
  }
  finally {
    searching.value = false
  }
}

/** 选中搜索结果：填充用户 ID 输入框（可手改） */
function onSelectResult(item: UiContact) {
  selectedUserId.value = item.userId
  userId.value = item.userId
  errorMsg.value = ''
}

async function onConfirm() {
  const targetId = userId.value.trim()
  if (!targetId)
    return
  if (targetId === currentUserId.value) {
    errorMsg.value = t('contact.addSelfError', '不能添加自己为好友')
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    // 提交链路：props.addFn → dataSource.addContact → SDK 默认
    if (props.addFn) {
      await props.addFn(targetId, reason.value.trim())
    }
    else {
      await addContact(targetId, reason.value.trim())
    }
    emit('added', targetId)
    onClose()
  }
  catch (err) {
    errorMsg.value = (err as Error).message || (t('contact.addFailed', '添加失败'))
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
  <Popup
    :show="props.show"
    :position="isMobile ? 'bottom' : 'center'"
    :show-close="true"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <div class="add-contact-modal" :class="{ 'add-contact-modal--mobile': isMobile }">
      <div class="add-contact-modal__header">
        <span class="add-contact-modal__title">{{ t('conversation.addContact', '添加联系人') }}</span>
      </div>
      <!-- #body 插槽：完全接管弹窗主体 -->
      <div v-if="$slots.body" class="add-contact-modal__body">
        <slot name="body" />
      </div>
      <div v-else class="add-contact-modal__body">
        <!-- 搜索模式：关键字搜索 + 候选结果 -->
        <template v-if="searchable">
          <div class="add-contact-modal__field">
            <label class="add-contact-modal__label">{{ t('contact.searchUser', '搜索用户') }}</label>
            <div class="add-contact-modal__search-row">
              <Input
                v-model="keyword"
                variant="default"
                :placeholder="t('contact.searchUserPlaceholder', '输入手机号 / 邮箱 / 用户 ID')"
                @submit="onSearch"
              />
              <Button
                type="primary"
                size="small"
                :disabled="!keyword.trim()"
                :loading="searching"
                @click="onSearch"
              >
                {{ t('contact.search', '搜索') }}
              </Button>
            </div>
          </div>
          <div v-if="searched" class="add-contact-modal__search-results">
            <Cell
              v-for="item in searchResults"
              :key="item.userId"
              :title="item.name || item.userId"
              :subtitle="item.userId"
              :active="selectedUserId === item.userId"
              size="normal"
              :border="false"
              :auto-height="true"
              @click="onSelectResult(item)"
            >
              <template #leading>
                <Avatar :src="item.avatar" :name="item.name" :size="36" />
              </template>
              <!-- #search-result 插槽：自定义结果项渲染（默认勾选图标） -->
              <template #trailing>
                <slot name="search-result" :item="item">
                  <Icon v-if="selectedUserId === item.userId" name="check" :size="16" class="add-contact-modal__result-check" />
                </slot>
              </template>
            </Cell>
            <div v-if="searchResults.length === 0" class="add-contact-modal__search-empty">
              {{ errorMsg || t('contact.searchEmpty', '未找到匹配的用户') }}
            </div>
          </div>
        </template>
        <div class="add-contact-modal__field">
          <label class="add-contact-modal__label">{{ t('contact.userId', '用户 ID') }}</label>
          <Input
            v-model="userId"
            variant="default"
            :placeholder="t('contact.addContactPlaceholder', '输入用户 ID')
            "
            @submit="onConfirm"
          />
        </div>
        <div class="add-contact-modal__field">
          <label class="add-contact-modal__label">{{ t('contact.inviteReason', '附言') }}</label>
          <Input
            v-model="reason"
            variant="default"
            :placeholder="t('contact.addContactReasonPlaceholder', '输入验证信息（可选）')
            "
          />
        </div>
        <div v-if="errorMsg && !(searchable && searched && searchResults.length === 0)" class="add-contact-modal__error">
          {{ errorMsg }}
        </div>
      </div>
      <!-- #footer 插槽：接管操作区 -->
      <div v-if="$slots.footer" class="add-contact-modal__footer">
        <slot name="footer" />
      </div>
      <div v-else class="add-contact-modal__footer">
        <Button type="default" @click="onClose">
          {{ t('button.cancel', '取消') }}
        </Button>
        <Button type="primary" :disabled="!canSubmit" :loading="loading" @click="onConfirm">
          {{ t('button.confirm', '确认') }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.add-contact-modal {
  width: 360px;
  max-width: 90vw;
  padding: 20px;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-contact-modal--mobile {
  width: 100vw;
  max-width: 100vw;
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
}

.add-contact-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-contact-modal__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.add-contact-modal__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-contact-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-contact-modal__label {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.add-contact-modal__error {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-danger-color, #ef4444);
}

.add-contact-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.add-contact-modal__search-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.add-contact-modal__search-row .uikit-input {
  flex: 1;
  min-width: 0;
}

.add-contact-modal__search-results {
  max-height: 220px;
  overflow-y: auto;
  margin: 0 -8px;
}

.add-contact-modal__search-empty {
  padding: 20px 8px;
  text-align: center;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-tertiary, #9ca3af);
}

.add-contact-modal__result-check {
  color: var(--uikit-primary-color);
}
</style>
