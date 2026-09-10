<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EmPopup as Popup } from '@easemob/uikit-core'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { EmCheckbox as Checkbox } from '@easemob/uikit-core'
import { EmInput as Input } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { useBlocklist } from '../../composables/use-blocklist'
import { useContact } from '../../composables/use-contact'
import { useUIKit } from '../../composables/use-uikit'
import type { UiContact as Contact } from '@easemob/uikit-core'

export interface BlockListAddModalProps {
  /** 是否展示 */
  show: boolean
}

const props = defineProps<BlockListAddModalProps>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'added', contacts: Contact[]): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { contactList } = useContact()
const { blockList, addBlock } = useBlocklist()

const keyword = ref('')
const selectedIds = ref<Set<string>>(new Set())

const blockedIdSet = computed(() => new Set(blockList.value.map(c => c.userId)))
const currentUserId = computed(() => stores.client.currentUser)

/** 可选联系人：排除自己与已拉黑者，按关键词过滤 */
const filteredContacts = computed<Contact[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  return contactList.value.filter((c) => {
    if (c.userId === currentUserId.value)
      return false
    if (blockedIdSet.value.has(c.userId))
      return false
    if (!kw)
      return true
    const name = (c.remark || c.name || c.userId).toLowerCase()
    return name.includes(kw) || c.userId.toLowerCase().includes(kw)
  })
})

function displayName(c: Contact): string {
  return c.remark || c.name || c.userId
}

function toggleSelect(contact: Contact) {
  const next = new Set(selectedIds.value)
  if (next.has(contact.userId))
    next.delete(contact.userId)
  else
    next.add(contact.userId)
  selectedIds.value = next
}

function reset() {
  keyword.value = ''
  selectedIds.value = new Set()
}

function close() {
  emit('update:show', false)
  reset()
}

watch(
  () => props.show,
  (show) => {
    if (!show)
      reset()
  },
)

async function onConfirm() {
  const ids = Array.from(selectedIds.value)
  const targets = contactList.value.filter(c => ids.includes(c.userId))
  if (targets.length === 0)
    return
  let failed = 0
  for (const contact of targets) {
    try {
      await addBlock(contact)
    }
    catch {
      failed += 1
    }
  }
  if (failed === 0)
    showToast(t('contact.blocklist.addSuccess', '添加成功'), 'success')
  else
    showToast(t('contact.blocklist.addFailed', '添加失败'), 'error')
  if (failed === 0)
    emit('added', targets)
  close()
}
</script>

<template>
  <Popup
    :show="props.show"
    position="center"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="close"
  >
    <div class="block-list-add-modal" @pointerdown.stop @click.stop>
      <div class="block-list-add-modal__header">
        <span class="block-list-add-modal__title">{{ t('contact.blocklist.add', '添加黑名单') }}</span>
      </div>

      <div class="block-list-add-modal__search">
        <Input
          v-model="keyword"
          variant="search"
          clearable
          clear-icon="search/xmark"
          :placeholder="t('contact.searchPlaceholder', '搜索联系人...')"
          prefix-icon="search"
        />
      </div>

      <div class="block-list-add-modal__body">
        <div v-if="filteredContacts.length === 0" class="block-list-add-modal__empty">
          {{ t('contact.blocklist.emptySelectable', '暂无可添加的联系人') }}
        </div>
        <Cell
          v-for="contact in filteredContacts"
          :key="contact.userId"
          class="block-list-add-modal__item"
          size="compact"
          :title="displayName(contact)"
          :selected="selectedIds.has(contact.userId)"
          @click="toggleSelect(contact)"
        >
          <template #leading>
            <Avatar :name="displayName(contact)" :src="contact.avatar" :size="36" />
          </template>
          <template #trailing>
            <Checkbox :checked="selectedIds.has(contact.userId)" />
          </template>
        </Cell>
      </div>

      <div class="block-list-add-modal__footer">
        <button class="block-list-add-modal__btn block-list-add-modal__btn--cancel" @click="close">
          {{ t('button.cancel', '取消') }}
        </button>
        <button
          class="block-list-add-modal__btn block-list-add-modal__btn--confirm"
          :disabled="selectedIds.size === 0"
          @click="onConfirm"
        >
          {{ t('button.confirm', '确定') }}
        </button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.block-list-add-modal {
  width: 360px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
}

.block-list-add-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
}

.block-list-add-modal__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.block-list-add-modal__search {
  padding: 0 16px 8px;
}

.block-list-add-modal__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px;
}

.block-list-add-modal__item {
  --uikit-item-hover-padding-x: 8px;
}

.block-list-add-modal__empty {
  text-align: center;
  padding: 32px 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.block-list-add-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
}

.block-list-add-modal__btn {
  padding: 6px 16px;
  border-radius: var(--uikit-components-radius, 6px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
  transition: all var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .block-list-add-modal__btn:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

.block-list-add-modal__btn--confirm {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
  color: var(--uikit-text-inverse);
}

@media (hover: hover) {
  .block-list-add-modal__btn--confirm:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.block-list-add-modal__btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
