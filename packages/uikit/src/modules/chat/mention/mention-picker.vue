<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useViewport } from '../../../composables/use-viewport'
import { useLocale } from '../../../locale'
import Popup from '../../../components/popup/popup.vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import Empty from '../../../components/empty/empty.vue'
import Cell from '../../../components/cell/cell.vue'
import type { MentionContact } from '../types'

export interface MentionPickerProps {
  /** 是否显示 */
  show: boolean
  /** 联系人列表 */
  contacts: MentionContact[]
  /** 过滤关键词（输入@后的字符） */
  keyword?: string
  /** 自定义标题 */
  title?: string
  /** 锚点元素（PC 模式下定位用） */
  anchor?: HTMLElement
}

export interface MentionPickerEmits {
  (e: 'update:show', value: boolean): void
  (e: 'select', contact: MentionContact): void
}

const props = withDefaults(defineProps<MentionPickerProps>(), {
  keyword: '',
  title: '',
})

const emit = defineEmits<MentionPickerEmits>()

const { isMobile } = useViewport()
const { t } = useLocale()

/** 搜索输入 */
const searchText = ref('')

/** 同步外部 keyword */
watch(() => props.keyword, (val) => {
  searchText.value = val
}, { immediate: true })

/** 过滤后的联系人 */
const filteredContacts = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return props.contacts
  return props.contacts.filter((c) => {
    const name = (c.remark || c.name || '').toLowerCase()
    const userId = (c.userId || '').toLowerCase()
    return name.includes(keyword) || userId.includes(keyword)
  })
})

/** 显示标题 */
const displayTitle = computed(() => props.title || t('mention.title') || '选择联系人')

/** 选择联系人 */
function onSelect(contact: MentionContact) {
  emit('select', contact)
  emit('update:show', false)
}

/** 关闭 */
function onClose() {
  emit('update:show', false)
}

/** 键盘事件 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    onClose()
  }
}
</script>

<template>
  <!-- PC 端：锚定 Popup 浮层 -->
  <template v-if="!isMobile">
    <Popup
      :show="props.show"
      :anchor="props.anchor"
      placement="bottom"
      :overlay="false"
      :close-on-click-overlay="true"
      @update:show="onClose"
      @close="onClose"
    >
      <div class="mention-picker mention-picker--pc">
        <!-- 搜索栏 -->
        <div class="mention-picker__search">
          <Icon name="misc/magnifier2" :size="16" class="mention-picker__search-icon" />
          <input
            v-model="searchText"
            type="text"
            class="mention-picker__search-input"
            :placeholder="t('mention.searchPlaceholder') || '搜索联系人...'"
            @keydown="onKeydown"
          />
        </div>
        <!-- 联系人列表 -->
        <div class="mention-picker__list">
          <Cell
            v-for="contact in filteredContacts"
            :key="contact.userId"
            class="mention-picker__cell"
            :title="contact.remark || contact.name"
            :subtitle="contact.remark ? contact.name : undefined"
            size="normal"
            :border="'bottom'"
            :auto-height="true"
            @click="onSelect(contact)"
          >
            <template #leading>
              <Avatar :src="contact.avatar" :name="contact.name" :size="36" />
            </template>
          </Cell>
          <Empty
            v-if="filteredContacts.length === 0"
            icon="empty/mentions"
            :description="t('mention.noResult') || '未找到联系人'"
            size="small"
          />
        </div>
      </div>
    </Popup>
  </template>

  <!-- H5 端：底部半屏 Popup -->
  <template v-else>
    <Popup
      :show="props.show"
      position="bottom"
      :overlay="true"
      :close-on-click-overlay="true"
      @update:show="onClose"
      @close="onClose"
    >
      <div class="mention-picker mention-picker--h5">
        <!-- 标题栏 -->
        <div class="mention-picker__header">
          <span class="mention-picker__header-title">{{ displayTitle }}</span>
          <span class="mention-picker__header-close" @click="onClose">
            <Icon name="actions/close" :size="20" />
          </span>
        </div>
        <!-- 搜索栏 -->
        <div class="mention-picker__search">
          <Icon name="misc/magnifier2" :size="16" class="mention-picker__search-icon" />
          <input
            v-model="searchText"
            type="text"
            class="mention-picker__search-input"
            :placeholder="t('mention.searchPlaceholder') || '搜索联系人...'"
          />
        </div>
        <!-- 联系人列表 -->
        <div class="mention-picker__list mention-picker__list--scrollable">
          <Cell
            v-for="contact in filteredContacts"
            :key="contact.userId"
            class="mention-picker__cell"
            :title="contact.remark || contact.name"
            :subtitle="contact.remark ? contact.name : undefined"
            size="large"
            :border="'bottom'"
            :auto-height="true"
            @click="onSelect(contact)"
          >
            <template #leading>
              <Avatar :src="contact.avatar" :name="contact.name" :size="40" />
            </template>
          </Cell>
          <Empty
            v-if="filteredContacts.length === 0"
            icon="empty/mentions"
            :description="t('mention.noResult') || '未找到联系人'"
            size="small"
          />
        </div>
      </div>
    </Popup>
  </template>
</template>

<style scoped>
/* ===== 通用样式 ===== */
.mention-picker {
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}

.mention-picker__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
}

.mention-picker__search-icon {
  flex-shrink: 0;
  color: var(--uikit-text-secondary);
}

.mention-picker__search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: var(--uikit-text-primary);
}

.mention-picker__search-input::placeholder {
  color: var(--uikit-text-secondary);
}

.mention-picker__list {
  max-height: 280px;
  overflow-y: auto;
}

.mention-picker__list--scrollable {
  max-height: 50vh;
}

.mention-picker__cell {
  /* 在 Popup 内取消 Cell 默认的水平内缩，让 hover 背景顶满容器 */
  --uikit-item-hover-padding-x: 0px;
  --uikit-item-hover-margin-x: 0px;
  --uikit-item-hover-radius: 0px;
}

/* ===== PC 端样式 ===== */
.mention-picker--pc {
  min-width: 220px;
  max-width: 300px;
  padding: 8px 0;
  border-radius: 8px;
}

.mention-picker--pc .mention-picker__list {
  padding: 4px 0;
}

/* ===== H5 端样式 ===== */
.mention-picker--h5 {
  width: 100%;
  padding: 0 0 12px;
  border-radius: 12px 12px 0 0;
}

.mention-picker__header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 14px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
}

.mention-picker__header-title {
  font-size: 16px;
  font-weight: 600;
}

.mention-picker__header-close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
  cursor: pointer;
}
</style>
