<script setup lang="ts">
import { ref } from 'vue'
import ContactList from '../../modules/contact/contact-list.vue'
import type {
  ContactGroupBy,
  ContactSelectMode,
} from '../../modules/contact/types'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { Contact } from '../../store/contact'

export interface ContactContainerProps {
  /** 是否展示头部，默认 true */
  showHeader?: boolean
  /** Header 标题 */
  title?: string
  /** Header 对齐方式，默认 left */
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
  /** 是否展示分组标题，默认 true */
  showGroupHeader?: boolean
  /** 是否展示字母导航，默认 true（仅 alphabet 模式） */
  showAlphabetNav?: boolean
  /** 选择模式，默认 'none' */
  selectMode?: ContactSelectMode
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
}

const props = withDefaults(defineProps<ContactContainerProps>(), {
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
  (e: 'contact-select', contact: Contact): void
  (e: 'contact-click', contact: Contact): void
  (e: 'contact-contextmenu', event: MouseEvent, contact: Contact): void
}>()

const listRef = ref<InstanceType<typeof ContactList>>()

defineExpose({
  scrollToGroup: (key: string) => listRef.value?.scrollToGroup?.(key),
})
</script>

<template>
  <div class="contact-container" :class="props.class" :style="props.style">
    <ContactList
      ref="listRef"
      :show-header="props.showHeader"
      :title="props.title"
      :header-align="props.headerAlign"
      :show-search="props.showSearch"
      :show-scroll-to-top="props.showScrollToTop"
      :empty-text="props.emptyText"
      :filter-fn="props.filterFn"
      :group-by="props.groupBy"
      :show-group-header="props.showGroupHeader"
      :show-alphabet-nav="props.showAlphabetNav"
      :select-mode="props.selectMode"
      :body-sticky="props.bodySticky"
      :footer-sticky="props.footerSticky"
      @select="(c: Contact) => emit('contact-select', c)"
      @click="(c: Contact) => emit('contact-click', c)"
      @contextmenu="(e: MouseEvent, c: Contact) => emit('contact-contextmenu', e, c)"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>
      <template v-if="$slots.body" #body>
        <slot name="body" />
      </template>
      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
      <template v-if="$slots.empty" #empty="slotProps">
        <slot name="empty" v-bind="slotProps" />
      </template>
      <template v-if="$slots['group-header']" #group-header="slotProps">
        <slot name="group-header" v-bind="slotProps" />
      </template>
      <template v-if="$slots.item" #item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
    </ContactList>
  </div>
</template>

<style scoped>
.contact-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}
</style>
