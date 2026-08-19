<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useGroup } from '../../composables/use-group'
import { useGroupFilter } from '../../composables/use-group-filter'
import { useGroupSort } from '../../composables/use-group-sort'
import { useLocale } from '@easemob/uikit-core'
import { resolvePinyin } from '../../composables/use-pinyin'
import { useArrowNavigation, useEscToClose, useKeyBindings } from '@easemob/uikit-core'
import ContactAlphabetNav from '../contact/contact-alphabet-nav.vue'
import { EmInput as Input } from '@easemob/uikit-core'
import { EmScrollToTop as ScrollToTop } from '@easemob/uikit-core'
import { EmSkeleton as Skeleton } from '@easemob/uikit-core'
import type { GroupFilterFn } from '../../composables/use-group-filter'
import type { UiGroup as Group } from '@easemob/uikit-core'
import type {
  AvatarShape,
  GroupDisabledFn,
  GroupGroupBy,
  GroupGroupItem,
  GroupItemSize,
  GroupListClickBehavior,
  GroupSelectMode,
  GroupSortBy,
  GroupSubtitleFn,
} from './types'
import GroupEmpty from './group-empty.vue'
import GroupItem from './group-item.vue'

export interface GroupListProps {
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
  filterFn?: GroupFilterFn
  /** 排序方式，默认 'none'（保持 store 顺序） */
  sortBy?: GroupSortBy
  /** 分组方式，默认 'none'（平铺） */
  groupBy?: GroupGroupBy
  /** 是否展示分组标题，默认 true（仅 groupBy !== 'none' 时） */
  showGroupHeader?: boolean
  /** 是否展示字母导航，默认 true（仅 groupBy === 'alphabet' 时） */
  showAlphabetNav?: boolean
  /** 选择模式 */
  selectMode?: GroupSelectMode
  /** 已选中 id 列表（受控，配合 update:selectedIds 实现 v-model） */
  selectedIds?: string[]
  /** 最大可选数量（multiple 模式生效） */
  maxSelected?: number
  /** disabled 判定 */
  disabledFn?: GroupDisabledFn
  /** 副标题提取函数 */
  subtitleFn?: GroupSubtitleFn
  /** 是否展示群头像，默认 true */
  showAvatar?: boolean
  /** 是否展示成员数，默认 true */
  showMemberCount?: boolean
  /** 头像尺寸（px），覆盖 itemSize 推断 */
  avatarSize?: number
  /** 头像形状，默认 rounded */
  avatarShape?: AvatarShape
  /** Item 紧凑度，默认 'normal' */
  itemSize?: GroupItemSize
  /** 是否处于加载态 */
  loading?: boolean
  /** 是否还有更多数据可加载，默认 true */
  hasMore?: boolean
  /** 触底距离阈值（px），默认 60 */
  loadMoreThreshold?: number
  /** 启用触底加载 */
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
  clickBehavior?: GroupListClickBehavior
}

const props = withDefaults(defineProps<GroupListProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showCount: false,
  showSearch: true,
  showScrollToTop: true,
  sortBy: 'none',
  groupBy: 'none',
  showGroupHeader: true,
  showAlphabetNav: true,
  selectMode: 'none',
  showAvatar: true,
  showMemberCount: true,
  avatarShape: undefined,
  itemSize: 'normal',
  loading: false,
  hasMore: true,
  loadMoreThreshold: 60,
  enableLoadMore: true,
  bodySticky: false,
  footerSticky: false,
  clickBehavior: 'default',
})

const emit = defineEmits<{
  /** 列表项被选中时触发（clickBehavior 为 'event-only' 时不触发），负载为群组对象 */
  (e: 'select', group: Group): void
  /** 点击列表项时触发（不受 clickBehavior 影响，始终发出），负载为群组对象 */
  (e: 'click', group: Group): void
  /** 右键点击列表项时触发，负载为原生右键事件 MouseEvent 与群组对象 */
  (e: 'contextmenu', event: MouseEvent, group: Group): void
  /** 通过字母导航跳转到分组后触发，负载为分组 key */
  (e: 'group-jump', key: string): void
  /** 选中集合变化时触发（配合 selectedIds 实现 v-model:selectedIds），负载为新的 id 数组 */
  (e: 'update:selectedIds', ids: string[]): void
  /** 选中数量超过 maxSelected 上限时触发（内部回退到上次合法选中），负载为上限值 */
  (e: 'max-exceed', max: number): void
  /** 滚动接近底部且满足加载条件时触发；外部加载完成后需调用 expose 的 releaseLoadMoreLock 释放锁 */
  (e: 'load-more'): void
  /** 搜索关键词变化时触发，负载为去除首尾空格后的关键词 */
  (e: 'search', keyword: string): void
}>()

const {
  groupList,
  selectedIds: storeSelectedIds,
  setSelectedIds,
  setActiveId,
} = useGroup()
const { t } = useLocale()

const itemsRef = ref<HTMLElement>()
/** 触底加载本地锁，防止异步请求期间重复触发 */
const isLoadingMore = ref(false)
// 搜索关键词为组件本地状态：group-list 被多个容器/弹窗复用，
// 写 store 会让搜索词跨场景残留，故默认不共享
const searchKeyword = ref('')
function setSearchKeyword(v: string) {
  searchKeyword.value = v
  emit('search', v.trim())
}
const normalizedKeyword = computed(() => searchKeyword.value.trim())

const sortByRef = computed(() => props.sortBy)
const groupByRef = computed(() => props.groupBy)

const filteredGroups = useGroupFilter(groupList, searchKeyword, {
  filterFn: props.filterFn,
})
const sortedGroups = useGroupSort(filteredGroups, sortByRef)

/** 总群组数（过滤后） */
const totalCount = computed(() => filteredGroups.value.length)

/** 群组分组逻辑（与 contact 对齐，但简化：默认 none，平铺为单组） */
function resolveGroupKey(g: Group, mode: GroupGroupBy): string {
  if (mode === 'none')
    return 'all'
  if (typeof mode === 'function')
    return mode(g)
  // alphabet 模式
  const raw = (g.groupName || '').trim()
  if (!raw)
    return '#'
  const first = raw.charAt(0).toUpperCase()
  if (/^[A-Z]$/.test(first))
    return first
  const py = resolvePinyin(raw)
  if (py && /^[A-Z]$/.test(py.firstLetter))
    return py.firstLetter
  return '#'
}

const groupedGroups = computed<GroupGroupItem[]>(() => {
  const list = sortedGroups.value
  const mode = groupByRef.value
  const map = new Map<string, Group[]>()
  const orderedKeys: string[] = []
  for (const item of list) {
    const key = resolveGroupKey(item, mode)
    if (!map.has(key)) {
      map.set(key, [])
      orderedKeys.push(key)
    }
    map.get(key)!.push(item)
  }
  return orderedKeys.map<GroupGroupItem>(key => ({
    key,
    title: key,
    items: map.get(key)!,
  }))
})

const isAlphabet = computed(() => props.groupBy === 'alphabet')
const isFlatNoGroup = computed(() => props.groupBy === 'none')

// ================== selectedIds 受控同步 ==================
const isInternalUpdate = ref(false)
const lastValidIds = ref<string[]>([])

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

watch(
  () => Array.from(storeSelectedIds.value),
  (next) => {
    if (isInternalUpdate.value)
      return
    if (props.maxSelected && next.length > props.maxSelected) {
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

// ================== 触底加载 ==================
function onScroll() {
  if (!props.enableLoadMore || props.loading || isLoadingMore.value || !props.hasMore)
    return
  const el = itemsRef.value
  if (!el)
    return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  if (distance <= props.loadMoreThreshold) {
    isLoadingMore.value = true
    emit('load-more')
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
  // 选中态保留在 store 供弹窗提交读取；卸载时清理本组件产生的选中，
  // 避免残留到下一个复用 group-list 的容器/弹窗（弹窗在提交时已读取选中，清理发生在其后）
  if (storeSelectedIds.value.size > 0)
    setSelectedIds([])
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

const alphabetKeys = computed(() => groupedGroups.value.map(g => g.key))

function onItemClick(group: Group) {
  emit('click', group)
  if (props.clickBehavior === 'event-only') {
    // 外部完全接管，不执行内部默认行为
    return
  }
  emit('select', group)
}

function onItemContextmenu(e: MouseEvent, group: Group) {
  emit('contextmenu', e, group)
}

/* ===== 键盘导航：鼠标进入列表区域后 ↑/↓ 移动焦点，Enter 确认选择 ===== */

/** 键盘导航是否激活：鼠标进入列表区域或点击列表时启用，Esc / 鼠标离开时停用 */
const keyboardNavActive = ref(false)
function enableKeyboardNav() {
  keyboardNavActive.value = true
}
function disableKeyboardNav() {
  keyboardNavActive.value = false
}
/** Esc 退出键盘导航 */
useEscToClose(keyboardNavActive, disableKeyboardNav)

/** 用于方向键导航的平铺群组列表（跳过分组标题） */
const navigableGroups = computed(() =>
  groupedGroups.value.flatMap(group => group.items),
)

const { activeIndex } = useArrowNavigation({
  count: computed(() => navigableGroups.value.length),
  wrap: true,
  active: keyboardNavActive,
  // 搜索框聚焦时方向键让位给输入光标
  ignoreWhenTyping: true,
  disabled: index => props.disabledFn ? props.disabledFn(navigableGroups.value[index]) : false,
  onActiveChange: (index) => {
    const group = navigableGroups.value[index]
    if (group) {
      setActiveId(group.groupId)
      scrollGroupIntoView(group.groupId)
      nextTick(() => itemsRef.value?.focus())
    }
  },
})

/** Enter 选中当前键盘高亮的群组 */
useKeyBindings({
  Enter: () => {
    const group = navigableGroups.value[activeIndex.value]
    if (group && !(props.disabledFn && props.disabledFn(group)))
      onItemClick(group)
  },
}, {
  active: keyboardNavActive,
  ignoreWhenTyping: true,
})

/** 将目标群组滚动进可视区 */
function scrollGroupIntoView(groupId: string) {
  nextTick(() => {
    const el = itemsRef.value?.querySelector<HTMLElement>(`[data-groupid="${groupId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

defineExpose({
  scrollToGroup,
  groupedGroups,
  releaseLoadMoreLock,
})
</script>

<template>
  <div class="group-list">
    <div
      v-if="props.showHeader"
      class="group-list__header"
      :class="`group-list__header--${props.headerAlign}`"
    >
      <slot name="header">
        <span class="group-list__title">
          {{ props.title || t('group.title') }}
          <span v-if="props.showCount" class="group-list__count">({{ totalCount }})</span>
        </span>
      </slot>
    </div>

    <div
      v-if="$slots.search || props.searchComponent || props.showSearch"
      class="group-list__search"
    >
      <slot name="search" :keyword="searchKeyword" :set-keyword="setSearchKeyword">
        <component
          :is="props.searchComponent"
          v-if="props.searchComponent"
          v-model="searchKeyword"
        />
        <Input
          v-else
          v-model="searchKeyword"
          variant="search"
          clearable
          clear-icon="search/xmark"
          :placeholder="t('group.searchPlaceholder')"
          prefix-icon="search"
        />
      </slot>
    </div>

    <!-- body slot - sticky 模式 -->
    <div
      v-if="$slots.body && props.bodySticky"
      class="group-list__body group-list__body--sticky"
    >
      <slot name="body" />
    </div>

    <div
      ref="itemsRef"
      tabindex="0"
      class="group-list__items"
      @mouseenter="enableKeyboardNav"
      @mouseleave="disableKeyboardNav"
      @click="enableKeyboardNav"
    >
      <!-- body slot - 非 sticky 模式 -->
      <div v-if="$slots.body && !props.bodySticky" class="group-list__body">
        <slot name="body" />
      </div>

      <!-- loading：默认骨架屏 -->
      <div
        v-if="props.loading && (groupedGroups.length === 0 || groupedGroups.every((g) => g.items.length === 0))"
        class="group-list__loading-wrap"
      >
        <slot name="loading">
          <div class="group-list__skeleton">
            <div v-for="i in 8" :key="i" class="group-list__skeleton-item">
              <Skeleton variant="avatar" shape="rounded" />
              <div class="group-list__skeleton-lines">
                <Skeleton variant="text" style="width: 35%;" />
                <Skeleton variant="text" style="width: 65%;" />
              </div>
            </div>
          </div>
        </slot>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="groupedGroups.length === 0 || groupedGroups.every((g) => g.items.length === 0)"
        class="group-list__empty-wrap"
      >
        <slot name="empty" :search-keyword="normalizedKeyword">
          <GroupEmpty
            :text="props.emptyText || (normalizedKeyword ? t('group.noSearchResult') : t('group.empty'))"
          />
        </slot>
      </div>

      <!-- 分组列表 -->
      <template v-else>
        <div
          v-for="group in (groupedGroups as GroupGroupItem[])"
          :key="group.key"
          class="group-list__group"
          :data-group-key="group.key"
        >
          <div
            v-if="props.showGroupHeader && !isFlatNoGroup"
            class="group-list__group-header"
          >
            <slot name="group-header" :group="group">
              <span>{{ group.title }}</span>
            </slot>
          </div>
          <GroupItem
            v-for="g in group.items"
            :key="g.groupId"
            :group="g"
            :select-mode="props.selectMode"
            :disabled="props.disabledFn ? props.disabledFn(g) : false"
            :show-avatar="props.showAvatar"
            :show-member-count="props.showMemberCount"
            :avatar-size="props.avatarSize"
            :avatar-shape="props.avatarShape"
            :subtitle="props.subtitleFn ? props.subtitleFn(g) : undefined"
            :size="props.itemSize"
            @click="onItemClick"
            @contextmenu="onItemContextmenu"
          >
            <template v-if="$slots.item" #default="slotProps">
              <slot name="item" v-bind="slotProps" />
            </template>
          </GroupItem>
        </div>

        <!-- 触底加载提示 -->
        <div
          v-if="props.loading && groupedGroups.length > 0"
          class="group-list__load-more"
        >
          <slot name="loading-more">
            <span class="group-list__loading-text">{{ t('common.loading') }}</span>
          </slot>
        </div>

        <!-- 没有更多提示 -->
        <div
          v-if="!props.loading && !props.hasMore && groupedGroups.length > 0"
          class="group-list__no-more"
        >
          <slot name="no-more">
            <span class="group-list__no-more-text">{{ props.noMoreText || t('common.noMore') }}</span>
          </slot>
        </div>
      </template>

      <!-- footer slot - 非 sticky 模式 -->
      <div v-if="$slots.footer && !props.footerSticky" class="group-list__footer">
        <slot name="footer" />
      </div>
    </div>

    <!-- footer slot - sticky 模式 -->
    <div
      v-if="$slots.footer && props.footerSticky"
      class="group-list__footer group-list__footer--sticky"
    >
      <slot name="footer" />
    </div>

    <!-- 字母导航（与 contact 对齐） -->
    <ContactAlphabetNav
      v-if="isAlphabet && props.showAlphabetNav && alphabetKeys.length > 0"
      :keys="alphabetKeys"
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
.group-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background-color: var(--uikit-bg-base);
}

.group-list__header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.group-list__header--center {
  justify-content: center;
}

.group-list__header--right {
  flex-direction: row-reverse;
}

.group-list__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.group-list__count {
  margin-left: 6px;
  font-size: var(--uikit-font-size-12);
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.group-list__search {
  padding: 2px 16px 8px;
}

.group-list__items {
  flex: 1;
  overflow-y: auto;
  position: relative;
  outline: none;
}

.group-list__group-header {
  padding: 6px 16px;
  font-size: var(--uikit-font-size-12);
  font-weight: 600;
  color: var(--uikit-text-secondary);
  background-color: var(--uikit-bg-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.group-list__body {
  padding: 0 16px;
}

.group-list__body--sticky {
  flex-shrink: 0;
}

.group-list__footer {
  padding: 8px 16px;
}

.group-list__footer--sticky {
  flex-shrink: 0;
}

.group-list__empty-wrap,
.group-list__loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.group-list__loading-text {
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.group-list__skeleton {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.group-list__skeleton-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-list__skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-list__load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
}

.group-list__no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
}

.group-list__no-more-text {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}
</style>
