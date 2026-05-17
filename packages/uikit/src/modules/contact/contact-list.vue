<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useContact } from '../../composables/use-contact'
import { useContactFilter } from '../../composables/use-contact-filter'
import { useContactGroup } from '../../composables/use-contact-group'
import { useViewport } from '../../composables/use-viewport'
import { useLocale } from '../../locale'
import ContactItem from './contact-item.vue'
import ContactEmpty from './contact-empty.vue'
import ContactAlphabetNav from './contact-alphabet-nav.vue'
import Input from '../../components/input/input.vue'
import ScrollToTop from '../../components/scroll-to-top/scroll-to-top.vue'
import type { ContactGroupBy, ContactGroupItem, ContactSelectMode } from './types'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { Contact } from '../../store/contact'

const props = withDefaults(defineProps<{
  /** 是否展示头部区域，默认 true */
  showHeader?: boolean
  /** Header 标题文本，不传则使用 i18n 默认值 */
  title?: string
  /** Header 内容对齐方式：left | center | right，默认 left */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否展示搜索框，默认 true */
  showSearch?: boolean
  /** 是否展示滚动置顶按钮，默认 true */
  showScrollToTop?: boolean
  /** 空列表提示文字 */
  emptyText?: string
  /** 自定义搜索过滤函数 */
  filterFn?: ContactFilterFn
  /** 分组方式，默认 'alphabet' */
  groupBy?: ContactGroupBy
  /** 是否展示分组标题，默认 true（仅 groupBy !== 'none' 时） */
  showGroupHeader?: boolean
  /** 是否展示字母导航，默认 true（仅 groupBy === 'alphabet' 时） */
  showAlphabetNav?: boolean
  /** 选择模式 */
  selectMode?: ContactSelectMode
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean
}>(), {
  showHeader: true,
  headerAlign: 'left',
  showSearch: true,
  showScrollToTop: true,
  groupBy: 'alphabet',
  showGroupHeader: true,
  showAlphabetNav: true,
  selectMode: 'none',
  bodySticky: false,
  footerSticky: false,
})

const emit = defineEmits<{
  (e: 'select', contact: Contact): void
  (e: 'click', contact: Contact): void
  (e: 'contextmenu', event: MouseEvent, contact: Contact): void
  (e: 'group-jump', key: string): void
}>()

const { contactList, filterText, setFilterText } = useContact()
const { t } = useLocale()
const { isMobile } = useViewport()

void isMobile

const itemsRef = ref<HTMLElement>()
const searchKeyword = computed({
  get: () => filterText.value,
  set: (v: string) => setFilterText(v),
})
const normalizedKeyword = computed(() => searchKeyword.value.trim())

/** 当前 groupBy 的响应式包装 */
const groupByRef = computed(() => props.groupBy)

const filteredContacts = useContactFilter(contactList, searchKeyword, {
  filterFn: props.filterFn,
})
const groupedContacts = useContactGroup(filteredContacts, groupByRef)

const isAlphabet = computed(() => props.groupBy === 'alphabet')
const isFlatNoGroup = computed(() => props.groupBy === 'none')

/** 跳转到指定分组 */
async function scrollToGroup(key: string) {
  await nextTick()
  const root = itemsRef.value
  if (!root) return
  const target = root.querySelector<HTMLElement>(`[data-group-key="${key}"]`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  emit('group-jump', key)
}

function onItemClick(contact: Contact) {
  emit('click', contact)
  emit('select', contact)
}

function onItemContextmenu(e: MouseEvent, contact: Contact) {
  emit('contextmenu', e, contact)
}

defineExpose({
  scrollToGroup,
  groupedContacts,
})
</script>

<template>
  <div class="contact-list">
    <div
      v-if="props.showHeader"
      class="contact-list__header"
      :class="`contact-list__header--${props.headerAlign}`"
    >
      <slot name="header">
        <span class="contact-list__title">{{ props.title || t('contact.title') }}</span>
      </slot>
    </div>

    <div v-if="props.showSearch" class="contact-list__search">
      <Input
        v-model="searchKeyword"
        :placeholder="t('contact.searchPlaceholder')"
        prefix-icon="misc/magnifier2"
      />
    </div>

    <!-- body slot - sticky 模式 -->
    <div
      v-if="$slots.body && props.bodySticky"
      class="contact-list__body contact-list__body--sticky"
    >
      <slot name="body" />
    </div>

    <div ref="itemsRef" class="contact-list__items">
      <!-- body slot - 非 sticky 模式 -->
      <div v-if="$slots.body && !props.bodySticky" class="contact-list__body">
        <slot name="body" />
      </div>

      <!-- 空状态 -->
      <div
        v-if="groupedContacts.length === 0"
        class="contact-list__empty-wrap"
      >
        <slot name="empty" :search-keyword="normalizedKeyword">
          <ContactEmpty
            :text="props.emptyText || (normalizedKeyword ? t('contact.noSearchResult') : t('contact.empty'))"
          />
        </slot>
      </div>

      <!-- 分组列表 -->
      <template v-else>
        <div
          v-for="group in (groupedContacts as ContactGroupItem[])"
          :key="group.key"
          class="contact-list__group"
          :data-group-key="group.key"
        >
          <div
            v-if="props.showGroupHeader && !isFlatNoGroup"
            class="contact-list__group-header"
          >
            <slot name="group-header" :group="group">
              <span>{{ group.title }}</span>
            </slot>
          </div>
          <ContactItem
            v-for="contact in group.items"
            :key="contact.userId"
            :contact="contact"
            :select-mode="props.selectMode"
            @click="onItemClick"
            @contextmenu="onItemContextmenu"
          >
            <template #default="slotProps">
              <slot name="item" v-bind="slotProps" />
            </template>
          </ContactItem>
        </div>
      </template>

      <!-- footer slot - 非 sticky 模式 -->
      <div v-if="$slots.footer && !props.footerSticky" class="contact-list__footer">
        <slot name="footer" />
      </div>
    </div>

    <!-- footer slot - sticky 模式 -->
    <div
      v-if="$slots.footer && props.footerSticky"
      class="contact-list__footer contact-list__footer--sticky"
    >
      <slot name="footer" />
    </div>

    <!-- 字母导航 -->
    <ContactAlphabetNav
      v-if="isAlphabet && props.showAlphabetNav && groupedContacts.length > 0"
      :groups="(groupedContacts as ContactGroupItem[])"
      @jump="scrollToGroup"
    />

    <!-- 滚动置顶 -->
    <ScrollToTop
      v-if="props.showScrollToTop"
      :target="itemsRef ?? undefined"
      :visibility-height="200"
      :bottom="12"
      :right="12"
    />
  </div>
</template>

<style scoped>
.contact-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  position: relative;
  background-color: var(--uikit-bg-base);
}

.contact-list__header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.contact-list__header--center {
  justify-content: center;
}

.contact-list__header--right {
  flex-direction: row-reverse;
}

.contact-list__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.contact-list__search {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.contact-list__items {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.contact-list__group-header {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--uikit-text-secondary);
  background-color: var(--uikit-bg-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.contact-list__body {
  padding: 0 16px;
}

.contact-list__body--sticky {
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
}

.contact-list__footer {
  padding: 8px 16px;
}

.contact-list__footer--sticky {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
}

.contact-list__empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
