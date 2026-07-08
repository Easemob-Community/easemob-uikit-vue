<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useContact } from '../../composables/use-contact'
import { useContactFilter } from '../../composables/use-contact-filter'
import { useContactGroup } from '../../composables/use-contact-group'
import { useContactSort } from '../../composables/use-contact-sort'
import { useViewport } from '../../composables/use-viewport'
import { useUIKit } from '../../composables/use-uikit'
import { usePresence } from '../../composables/use-presence'
import { useLocale } from '../../locale'
import Input from '../../components/input/input.vue'
import ScrollToTop from '../../components/scroll-to-top/scroll-to-top.vue'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { ContactSortBy } from '../../composables/use-contact-sort'
import type { UiContact as Contact } from '../../sdk/types'
import type {
  AvatarShape,
  ContactDisabledFn,
  ContactGroupBy,
  ContactGroupItem,
  ContactItemSize,
  ContactListClickBehavior,
  ContactOnlineStatusFn,
  ContactSelectMode,
  ContactSubtitleFn,
  OnlineStatus,
} from './types'
import ContactAlphabetNav from './contact-alphabet-nav.vue'
import ContactEmpty from './contact-empty.vue'
import ContactItem from './contact-item.vue'

export interface ContactListProps {
  /** 是否展示头部区域，默认 true */
  showHeader?: boolean
  /** Header 标题文本，不传则使用 i18n 默认值 */
  title?: string
  /** Header 内容对齐方式：left | center | right，默认 left */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否在标题旁展示数量徽标 (n)，默认 false */
  showCount?: boolean
  /** 是否展示搜索框，默认 true */
  showSearch?: boolean
  /** 是否展示滚动置顶按钮，默认 true */
  showScrollToTop?: boolean
  /** 空列表提示文字 */
  emptyText?: string
  /** 自定义搜索过滤函数 */
  filterFn?: ContactFilterFn
  /** 排序方式，默认 'none' */
  sortBy?: ContactSortBy
  /** 分组方式，默认 'alphabet' */
  groupBy?: ContactGroupBy
  /** 是否展示分组标题，默认 true（仅 groupBy !== 'none' 时） */
  showGroupHeader?: boolean
  /** 是否展示字母导航，默认 true（仅 groupBy === 'alphabet' 时） */
  showAlphabetNav?: boolean
  /** 选择模式 */
  selectMode?: ContactSelectMode
  /** 已选中 id 列表（受控，配合 update:selectedIds 实现 v-model） */
  selectedIds?: string[]
  /** 最大可选数量（multiple 模式生效），超过会被回滚并 emit max-exceed */
  maxSelected?: number
  /** disabled 判定（如：排除自己 / 已加群成员） */
  disabledFn?: ContactDisabledFn
  /** 副标题提取函数（双行排版） */
  subtitleFn?: ContactSubtitleFn
  /** 在线状态提取函数 */
  onlineStatusFn?: ContactOnlineStatusFn
  /** 是否展示头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸（px），覆盖 itemSize 推断 */
  avatarSize?: number
  /** 头像形状，默认 circle */
  avatarShape?: AvatarShape
  /** Item 紧凑度，默认 'normal' */
  itemSize?: ContactItemSize
  /** 是否处于加载态，展示骨架/loading 提示 */
  loading?: boolean
  /** 是否还有更多数据可加载，默认 true */
  hasMore?: boolean
  /** 触底距离阈值（px），<= 该距离触发 load-more，默认 60 */
  loadMoreThreshold?: number
  /** 启用触底加载（loading 期间不触发） */
  enableLoadMore?: boolean
  /** 自定义"没有更多"提示文案 */
  noMoreText?: string
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean
  /** 自定义搜索组件（完全接管搜索逻辑与UI），传入后 showSearch 失效 */
  searchComponent?: Component
  /** 列表项点击行为模式，默认 'default' */
  clickBehavior?: ContactListClickBehavior
  /** 是否展示联系人头像在线状态；不传则使用 Provider 全局 enablePresence 配置 */
  enablePresence?: boolean
}

const props = withDefaults(defineProps<ContactListProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showCount: false,
  showSearch: true,
  showScrollToTop: true,
  sortBy: 'none',
  groupBy: 'alphabet',
  showGroupHeader: true,
  showAlphabetNav: true,
  selectMode: 'none',
  showAvatar: true,
  avatarShape: 'circle',
  itemSize: 'normal',
  loading: false,
  hasMore: true,
  loadMoreThreshold: 60,
  enableLoadMore: false,
  bodySticky: false,
  footerSticky: false,
  clickBehavior: 'default',
})

const emit = defineEmits<{
  (e: 'select', contact: Contact): void
  (e: 'click', contact: Contact): void
  (e: 'contextmenu', event: MouseEvent, contact: Contact): void
  (e: 'group-jump', key: string): void
  (e: 'update:selectedIds', ids: string[]): void
  (e: 'max-exceed', max: number): void
  (e: 'load-more'): void
}>()

const {
  contactList,
  filterText,
  setFilterText,
  selectedIds: storeSelectedIds,
  setSelectedIds,
} = useContact()
const { t } = useLocale()
const { isMobile } = useViewport()
void isMobile

// ================== Presence 默认兑底 ==================
// 当外部未传 onlineStatusFn 且（组件 prop 或 Provider 全局）enablePresence===true 时，
// 内部使用 usePresence 提供在线状态，并按过滤后的可见联系人 ID 自动订阅。
const { features } = useUIKit()
const presenceEnabled = computed(
  () => (props.enablePresence ?? features.enablePresence) && !props.onlineStatusFn,
)
const presence = usePresence()

const itemsRef = ref<HTMLElement>()
/** 触底加载本地锁，防止异步请求期间重复触发 */
const isLoadingMore = ref(false)
/** 当前可视区域的分组 key，用于字母导航高亮 */
const activeGroupKey = ref('')
const searchKeyword = computed({
  get: () => filterText.value,
  set: (v: string) => setFilterText(v),
})
const normalizedKeyword = computed(() => searchKeyword.value.trim())

/** 排序 + 过滤 + 分组 流水线 */
const sortByRef = computed(() => props.sortBy)
const groupByRef = computed(() => props.groupBy)

const sortedContacts = useContactSort(contactList, sortByRef)
const filteredContacts = useContactFilter(sortedContacts, searchKeyword, {
  filterFn: props.filterFn,
})
const groupedContacts = useContactGroup(filteredContacts, groupByRef)

const isAlphabet = computed(() => props.groupBy === 'alphabet')
const isFlatNoGroup = computed(() => props.groupBy === 'none')

/** 总联系人数（过滤后） */
const totalCount = computed(() => filteredContacts.value.length)

// 过滤后的联系人 ID 集合，作为 Presence 订阅范围
const visibleUserIds = computed(() =>
  presenceEnabled.value ? filteredContacts.value.map(c => c.userId) : [],
)
// 启用时：自动 retain/release，卸载时释放
if (presenceEnabled.value) {
  presence.watch(visibleUserIds)
}

/** 默认在线状态提取：优先用外部 onlineStatusFn，其次走 usePresence 兑底 */
function resolveOnlineStatus(c: Contact): OnlineStatus | undefined {
  if (props.onlineStatusFn)
    return props.onlineStatusFn(c)
  if (!(props.enablePresence ?? features.enablePresence))
    return undefined
  const info = presence.get(c.userId).value
  if (!info)
    return undefined
  return info.status
}

// ================== selectedIds 受控同步 ==================

const isInternalUpdate = ref(false)
const lastValidIds = ref<string[]>([])

// props -> store
watch(
  () => props.selectedIds,
  (ids) => {
    if (!ids)
      return
    const cur = Array.from(storeSelectedIds.value).slice().sort().join(',')
    const next = [...ids].slice().sort().join(',')
    if (cur !== next) {
      isInternalUpdate.value = true
      setSelectedIds(ids)
      lastValidIds.value = [...ids]
      nextTick(() => {
        isInternalUpdate.value = false
      })
    }
  },
  { immediate: true },
)

// store -> props (含 maxSelected 拦截)
watch(
  () => Array.from(storeSelectedIds.value),
  (next) => {
    if (isInternalUpdate.value)
      return
    if (props.maxSelected && next.length > props.maxSelected) {
      // 回滚到上一次合法集合
      isInternalUpdate.value = true
      setSelectedIds(lastValidIds.value)
      nextTick(() => {
        isInternalUpdate.value = false
      })
      emit('max-exceed', props.maxSelected)
      return
    }
    lastValidIds.value = [...next]
    emit('update:selectedIds', next)
  },
)

// ================== 触底加载 & 分组高亮 ==================
function onScroll() {
  const el = itemsRef.value
  if (!el)
    return

  // 触底加载
  if (props.enableLoadMore && !props.loading && !isLoadingMore.value && props.hasMore) {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance <= props.loadMoreThreshold) {
      isLoadingMore.value = true
      emit('load-more')
    }
  }

  // 更新当前可视分组高亮
  if (isAlphabet.value && props.showAlphabetNav && groupedContacts.value.length > 0) {
    const headers = el.querySelectorAll<HTMLElement>('[data-group-key]')
    let current = ''
    for (let i = headers.length - 1; i >= 0; i--) {
      const header = headers[i]
      if (header.offsetTop <= el.scrollTop + 4) {
        current = header.getAttribute('data-group-key') || ''
        break
      }
    }
    // 如果还没滚动到任何 header，默认第一个分组
    if (!current && headers.length > 0) {
      current = headers[0].getAttribute('data-group-key') || ''
    }
    activeGroupKey.value = current
  }
}

/** 释放触底加载锁（由外部在 load-more 完成后调用） */
function releaseLoadMoreLock() {
  isLoadingMore.value = false
}

const scrollEl = ref<HTMLElement | null>(null)

onMounted(() => {
  scrollEl.value = itemsRef.value ?? null
  scrollEl.value?.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  if (scrollEl.value) {
    scrollEl.value.removeEventListener('scroll', onScroll)
  }
})

/** 跳转到指定分组 */
async function scrollToGroup(key: string) {
  await nextTick()
  const root = itemsRef.value
  if (!root)
    return
  const target = root.querySelector<HTMLElement>(`[data-group-key="${key}"]`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  emit('group-jump', key)
}

function onItemClick(contact: Contact) {
  emit('click', contact)
  if (props.clickBehavior === 'event-only') {
    // 外部完全接管，不执行内部默认行为
    return
  }
  emit('select', contact)
}

function onItemContextmenu(e: MouseEvent, contact: Contact) {
  emit('contextmenu', e, contact)
}

defineExpose({
  scrollToGroup,
  groupedContacts,
  releaseLoadMoreLock,
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
        <span class="contact-list__title">
          {{ props.title || t('contact.title') }}
          <span v-if="props.showCount" class="contact-list__count">({{ totalCount }})</span>
        </span>
      </slot>
    </div>

    <div
      v-if="$slots.search || props.searchComponent || props.showSearch"
      class="contact-list__search"
    >
      <slot name="search" :keyword="searchKeyword" :set-keyword="setFilterText">
        <component
          :is="props.searchComponent"
          v-if="props.searchComponent"
          v-model="searchKeyword"
        />
        <Input
          v-else
          v-model="searchKeyword"
          variant="search"
          :placeholder="t('contact.searchPlaceholder')"
          prefix-icon="misc/magnifier2"
        />
      </slot>
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

      <!-- loading（有数据时也展示在顶部覆盖；无数据时占位） -->
      <div
        v-if="props.loading && groupedContacts.length === 0"
        class="contact-list__loading-wrap"
      >
        <slot name="loading">
          <span class="contact-list__loading-text">{{ t('common.loading') }}</span>
        </slot>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="groupedContacts.length === 0"
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
            :disabled="props.disabledFn ? props.disabledFn(contact) : false"
            :show-avatar="props.showAvatar"
            :avatar-size="props.avatarSize"
            :avatar-shape="props.avatarShape"
            :subtitle="props.subtitleFn ? props.subtitleFn(contact) : undefined"
            :online-status="resolveOnlineStatus(contact)"
            :size="props.itemSize"
            @click="onItemClick"
            @contextmenu="onItemContextmenu"
          >
            <template v-if="$slots.item" #default="slotProps">
              <slot name="item" v-bind="slotProps" />
            </template>
          </ContactItem>
        </div>

        <!-- 触底加载提示 -->
        <div
          v-if="props.loading && groupedContacts.length > 0"
          class="contact-list__load-more"
        >
          <slot name="loading-more">
            <span class="contact-list__loading-text">{{ t('common.loading') }}</span>
          </slot>
        </div>

        <!-- 没有更多提示 -->
        <div
          v-if="!props.loading && !props.hasMore && groupedContacts.length > 0"
          class="contact-list__no-more"
        >
          <slot name="no-more">
            <span class="contact-list__no-more-text">{{ props.noMoreText || t('common.noMore') }}</span>
          </slot>
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
      :active-key="activeGroupKey"
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
  position: relative;
  background-color: var(--uikit-bg-base);
}

.contact-list__header {
  padding: 12px 16px;
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

.contact-list__count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.contact-list__search {
  padding: 2px 18px 8px;
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
}

.contact-list__footer {
  padding: 8px 16px;
}

.contact-list__footer--sticky {
  flex-shrink: 0;
}

.contact-list__empty-wrap,
.contact-list__loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.contact-list__loading-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

.contact-list__load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
}

.contact-list__no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
}

.contact-list__no-more-text {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}
</style>
