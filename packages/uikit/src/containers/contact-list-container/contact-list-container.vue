<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import ContactList from '../../modules/contact/contact-list.vue'
import { useContact } from '../../composables/use-contact'
import { useContactStore } from '../../store/contact'
import { useUIKit } from '../../composables/use-uikit'
import type {
  ContactGroupBy,
  ContactSelectMode,
  ContactItemSize,
  AvatarShape,
  ContactDisabledFn,
  ContactSubtitleFn,
  ContactOnlineStatusFn,
} from '../../modules/contact/types'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { ContactSortBy } from '../../composables/use-contact-sort'
import type { Contact } from '../../store/contact'

export interface ContactListContainerProps {
  // ---------- 外观 ----------
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
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>

  // ---------- 列表配置 ----------
  /** 空列表提示文字 */
  emptyText?: string
  /** 自定义搜索过滤函数 */
  filterFn?: ContactFilterFn
  /** 排序方式，默认 'none' */
  sortBy?: ContactSortBy
  /** 分组方式，默认 'alphabet' */
  groupBy?: ContactGroupBy
  /** 是否展示分组标题，默认 true */
  showGroupHeader?: boolean
  /** 字母导航，默认 true */
  showAlphabetNav?: boolean
  /** 是否展示计数 */
  showCount?: boolean
  /** 选择模式，默认 'none' */
  selectMode?: ContactSelectMode
  /** 受控选中 id 列表 (v-model:selectedIds) */
  selectedIds?: string[]
  /** 最大可选数量 */
  maxSelected?: number
  /** disabled 判定 */
  disabledFn?: ContactDisabledFn
  /** 副标题提取 */
  subtitleFn?: ContactSubtitleFn
  /** 在线状态提取 */
  onlineStatusFn?: ContactOnlineStatusFn
  /** 是否展示头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸 */
  avatarSize?: number
  /** 头像形状 */
  avatarShape?: AvatarShape
  /** Item 紧凑度 */
  itemSize?: ContactItemSize
  /** 加载态 */
  loading?: boolean
  /** 启用触底加载 */
  enableLoadMore?: boolean
  /** 触底阈值 */
  loadMoreThreshold?: number
  /** "没有更多"提示文案 */
  noMoreText?: string
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean

  // ---------- 自治拉取 ----------
  /**
   * mount 时自动拉取联系人列表，默认 true。
   * 需 Provider.enableContact=true 才会生效；
   * 已加载则跳过（幂等），如需强制刷新请手动调用 useContact().refresh(true)。
   */
  autoFetch?: boolean
}

const props = withDefaults(defineProps<ContactListContainerProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showSearch: true,
  showScrollToTop: true,
  sortBy: 'none',
  groupBy: 'alphabet',
  showGroupHeader: true,
  showAlphabetNav: true,
  showCount: false,
  selectMode: 'none',
  showAvatar: true,
  avatarShape: 'circle',
  itemSize: 'normal',
  loading: false,
  enableLoadMore: true,
  loadMoreThreshold: 60,
  bodySticky: false,
  footerSticky: false,
  autoFetch: true,
})

const emit = defineEmits<{
  (e: 'select', contact: Contact): void
  (e: 'click', contact: Contact): void
  (e: 'contextmenu', event: MouseEvent, contact: Contact): void
  (e: 'load-more'): void
  (e: 'max-exceed', max: number): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

const { refresh: refreshContacts, loadMore: loadMoreContacts } = useContact()
const { features } = useUIKit()
const contactStore = useContactStore()

const contactListRef = ref<InstanceType<typeof ContactList>>()

/** 自治拉取 */
function maybeFetchContacts() {
  if (!props.autoFetch) return
  if (!features.enableContact) return
  if (contactStore.loaded) return
  refreshContacts()
}

onMounted(() => {
  maybeFetchContacts()
})

/** 处理触底加载更多 */
async function handleContactLoadMore() {
  try {
    await loadMoreContacts()
  } finally {
    contactListRef.value?.releaseLoadMoreLock?.()
  }
}

function scrollToGroup(key: string) {
  contactListRef.value?.scrollToGroup?.(key)
}

defineExpose({
  scrollToGroup,
  contactListRef,
})
</script>

<template>
  <div class="contact-list-container" :class="props.class" :style="props.style">
    <ContactList
      ref="contactListRef"
      :show-header="props.showHeader"
      :title="props.title"
      :header-align="props.headerAlign"
      :show-search="props.showSearch"
      :show-scroll-to-top="props.showScrollToTop"
      :show-count="props.showCount"
      :empty-text="props.emptyText"
      :filter-fn="props.filterFn"
      :sort-by="props.sortBy"
      :group-by="props.groupBy"
      :show-group-header="props.showGroupHeader"
      :show-alphabet-nav="props.showAlphabetNav"
      :select-mode="props.selectMode"
      :selected-ids="props.selectedIds"
      :max-selected="props.maxSelected"
      :disabled-fn="props.disabledFn"
      :subtitle-fn="props.subtitleFn"
      :online-status-fn="props.onlineStatusFn"
      :show-avatar="props.showAvatar"
      :avatar-size="props.avatarSize"
      :avatar-shape="props.avatarShape"
      :item-size="props.itemSize"
      :loading="props.loading"
      :has-more="contactStore.hasMore"
      :enable-load-more="props.enableLoadMore"
      :load-more-threshold="props.loadMoreThreshold"
      :no-more-text="props.noMoreText"
      :body-sticky="props.bodySticky"
      :footer-sticky="props.footerSticky"
      @select="(c: Contact) => emit('select', c)"
      @click="(c: Contact) => emit('click', c)"
      @contextmenu="(e: MouseEvent, c: Contact) => emit('contextmenu', e, c)"
      @load-more="handleContactLoadMore"
      @max-exceed="(m: number) => emit('max-exceed', m)"
      @update:selected-ids="(ids: string[]) => emit('update:selectedIds', ids)"
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
      <template v-if="$slots.loading" #loading>
        <slot name="loading" />
      </template>
      <template v-if="$slots['loading-more']" #loading-more>
        <slot name="loading-more" />
      </template>
      <template v-if="$slots['no-more']" #no-more>
        <slot name="no-more" />
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
.contact-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
