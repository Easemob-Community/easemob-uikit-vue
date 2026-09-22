<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EmModal as Modal } from '@easemob-community/uikit-core'
import { EmAvatar as Avatar } from '@easemob-community/uikit-core'
import { EmCell as Cell } from '@easemob-community/uikit-core'
import { EmCheckbox as Checkbox } from '@easemob-community/uikit-core'
import { EmInput as Input } from '@easemob-community/uikit-core'
import { useLocale } from '@easemob-community/uikit-core'
import { useToast } from '@easemob-community/uikit-core'
import { useBlocklist } from '../../composables/use-blocklist'
import { useContact } from '../../composables/use-contact'
import { useUIKit } from '../../composables/use-uikit'
import type { UiContact as Contact } from '@easemob-community/uikit-core'

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
  <Modal
    :show="props.show"
    :title="t('contact.blocklist.add', '添加黑名单')"
    :width="360"
    :confirm-text="t('button.confirm', '确定')"
    :confirm-disabled="selectedIds.size === 0"
    :confirm-auto-close="false"
    body-flush
    @update:show="(v: boolean) => emit('update:show', v)"
    @confirm="onConfirm"
    @cancel="close"
  >
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
  </Modal>
</template>

<style scoped>
.block-list-add-modal__search {
  padding: 16px 24px 8px;
  flex-shrink: 0;
}

.block-list-add-modal__body {
  height: min(50vh, 400px);
  overflow-y: auto;
}

/* 行对齐 Shuttle 范式：通栏无间距，行间发丝线左内收（避开头像列，从名字起点开始） */
.block-list-add-modal__item {
  --uikit-item-hover-padding-x: 24px;
  margin-bottom: 0;
}

.block-list-add-modal__item::after {
  content: '';
  position: absolute;
  left: calc(var(--uikit-item-hover-padding-x, 24px) + 36px + 10px);
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.block-list-add-modal__empty {
  text-align: center;
  padding: 32px 16px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}
</style>
