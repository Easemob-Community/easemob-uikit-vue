<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useViewport } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useArrowNavigation, useKeyBindings } from '@easemob/uikit-core'
import { EmPopup as Popup } from '@easemob/uikit-core'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmIconButton as IconButton } from '@easemob/uikit-core'
import { EmEmpty as Empty } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
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
const displayTitle = computed(() => props.title || t('mention.title', '选择联系人'))

/** 选择联系人 */
function onSelect(contact: MentionContact) {
  emit('select', contact)
  emit('update:show', false)
}

/** 关闭 */
function onClose() {
  emit('update:show', false)
}

/** 列表容器 ref（用于滚动高亮项到可视区） */
const listRef = ref<HTMLElement>()

/** 弹层显示/关键词变化时重置高亮位置 */
watch(() => props.show, (show) => {
  if (show)
    activeIndex.value = 0
})
watch(filteredContacts, (list) => {
  if (activeIndex.value >= list.length)
    activeIndex.value = list.length > 0 ? 0 : 0
})

/** 键盘导航：弹层打开时 ↑/↓ 移动高亮，Enter 确认选择；输入框聚焦时也接管方向键 */
const { activeIndex } = useArrowNavigation({
  count: computed(() => filteredContacts.value.length),
  wrap: true,
  active: computed(() => props.show && filteredContacts.value.length > 0),
  repeat: true,
  // 提及面板方向键需要覆盖输入框默认光标移动
  ignoreWhenTyping: false,
  onActiveChange: () => {
    scrollActiveIntoView()
  },
})

/** Enter 选中当前高亮联系人；阻止默认行为避免表单提交 */
useKeyBindings({
  Enter: () => {
    const contact = filteredContacts.value[activeIndex.value]
    if (contact)
      onSelect(contact)
  },
}, {
  active: computed(() => props.show && filteredContacts.value.length > 0),
  ignoreWhenTyping: false,
  preventDefault: true,
})

/** 将当前高亮项滚动进可视区 */
function scrollActiveIntoView() {
  nextTick(() => {
    const el = listRef.value?.querySelector<HTMLElement>('.mention-picker__cell.is-active')
    el?.scrollIntoView({ block: 'nearest' })
  })
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
          <Icon name="search" :size="16" class="mention-picker__search-icon" />
          <input
            v-model="searchText"
            type="text"
            class="mention-picker__search-input"
            :placeholder="t('mention.searchPlaceholder', '搜索联系人...')"
          />
        </div>
        <!-- 联系人列表 -->
        <div ref="listRef" class="mention-picker__list">
          <Cell
            v-for="(contact, index) in filteredContacts"
            :key="contact.userId"
            class="mention-picker__cell"
            :active="activeIndex === index"
            :title="contact.remark || contact.name"
            :subtitle="contact.remark && contact.remark !== contact.name ? contact.name : undefined"
            size="normal"
            :border="false"
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
            :description="t('mention.noResult', '未找到联系人')"
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
          <IconButton
            class="mention-picker__header-close"
            icon="xmark/light"
            size="small"
            variant="ghost"
            :title="t('button.close', '关闭')"
            @click="onClose"
          />
        </div>
        <!-- 搜索栏 -->
        <div class="mention-picker__search">
          <Icon name="search" :size="16" class="mention-picker__search-icon" />
          <input
            v-model="searchText"
            type="text"
            class="mention-picker__search-input"
            :placeholder="t('mention.searchPlaceholder', '搜索联系人...')"
          />
        </div>
        <!-- 联系人列表 -->
        <div ref="listRef" class="mention-picker__list mention-picker__list--scrollable">
          <Cell
            v-for="(contact, index) in filteredContacts"
            :key="contact.userId"
            class="mention-picker__cell"
            :active="activeIndex === index"
            :title="contact.remark || contact.name"
            :subtitle="contact.remark && contact.remark !== contact.name ? contact.name : undefined"
            size="large"
            :border="false"
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
            :description="t('mention.noResult', '未找到联系人')"
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
  font-size: var(--uikit-font-size-14);
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
  /* 在 Popup 内给 Cell hover 背景留出圆角与舒适内边距 */
  --uikit-item-hover-padding-x: 12px;
  --uikit-item-hover-margin-x: 0px;
  --uikit-item-hover-radius: 8px;
}

/* ===== PC 端样式 ===== */
.mention-picker--pc {
  min-width: 220px;
  max-width: 320px;
  padding: 8px;
  border-radius: 12px;
}

.mention-picker--pc .mention-picker__list {
  padding: 4px 0;
}

/* ===== H5 端样式 ===== */
.mention-picker--h5 {
  width: 100%;
  padding: 0 16px 16px;
  border-radius: 16px 16px 0 0;
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
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
}

.mention-picker__header-close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
