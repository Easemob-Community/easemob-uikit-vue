<script setup lang="ts">
import { ref, onMounted } from 'vue'
import GroupList from '../../modules/group/group-list.vue'
import { useGroup } from '../../composables/use-group'
import { useGroupStore } from '../../store/group'
import { useUIKit } from '../../composables/use-uikit'
import type {
  GroupGroupBy,
  GroupSelectMode,
  GroupSortBy,
  GroupItemSize,
  GroupDisabledFn,
  GroupSubtitleFn,
  AvatarShape,
} from '../../modules/group/types'
import type { GroupFilterFn } from '../../composables/use-group-filter'
import type { Group } from '../../store/group'

export interface GroupListContainerProps {
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
  /** 排序方式，默认 'none' */
  sortBy?: GroupSortBy
  /** 分组方式，默认 'none' */
  groupBy?: GroupGroupBy
  /** 是否展示分组标题，默认 true */
  showGroupHeader?: boolean
  /** 字母导航，默认 true */
  showAlphabetNav?: boolean
  /** 是否展示计数 */
  showCount?: boolean
  /** 选择模式，默认 'none' */
  selectMode?: GroupSelectMode
  /** 受控选中 id 列表 (v-model:selectedIds) */
  selectedIds?: string[]
  /** 最大可选数量 */
  maxSelected?: number
  /** disabled 判定 */
  disabledFn?: GroupDisabledFn
  /** 副标题提取 */
  subtitleFn?: GroupSubtitleFn
  /** 是否展示群头像，默认 true */
  showAvatar?: boolean
  /** 是否展示成员数，默认 true */
  showMemberCount?: boolean
  /** 头像尺寸 */
  avatarSize?: number
  /** 头像形状 */
  avatarShape?: AvatarShape
  /** Item 紧凑度 */
  itemSize?: GroupItemSize
  /** 加载态 */
  loading?: boolean
  /** 启用触底加载 */
  enableLoadMore?: boolean
  /** 触底阈值 */
  loadMoreThreshold?: number
  /** 空列表提示 */
  emptyText?: string
  /** "没有更多"提示文案 */
  noMoreText?: string
  /** 自定义搜索过滤函数 */
  filterFn?: GroupFilterFn
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean

  // ---------- 自治拉取 ----------
  /**
   * mount 时自动拉取群组列表，默认 true。
   * 已加载则跳过（幂等），如需强制刷新请手动调用 useGroup().refresh(true)。
   */
  autoFetch?: boolean
}

const props = withDefaults(defineProps<GroupListContainerProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showSearch: true,
  showScrollToTop: true,
  sortBy: 'none',
  groupBy: 'none',
  showGroupHeader: true,
  showAlphabetNav: true,
  showCount: false,
  selectMode: 'none',
  showAvatar: true,
  showMemberCount: true,
  avatarShape: 'rounded',
  itemSize: 'normal',
  loading: false,
  enableLoadMore: true,
  loadMoreThreshold: 60,
  bodySticky: false,
  footerSticky: false,
  autoFetch: true,
})

const emit = defineEmits<{
  (e: 'select', group: Group): void
  (e: 'click', group: Group): void
  (e: 'contextmenu', event: MouseEvent, group: Group): void
  (e: 'load-more'): void
  (e: 'max-exceed', max: number): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

const { refresh: refreshGroups, loadMore: loadMoreGroups } = useGroup()
const { features } = useUIKit()
const groupStore = useGroupStore()

const groupListRef = ref<InstanceType<typeof GroupList>>()

/** 自治拉取 */
function maybeFetchGroups() {
  if (!props.autoFetch) return
  if (!features.enableGroup) return
  if (groupStore.loaded) return
  refreshGroups()
}

onMounted(() => {
  maybeFetchGroups()
})

/** 处理触底加载更多 */
async function handleGroupLoadMore() {
  try {
    await loadMoreGroups()
  } finally {
    groupListRef.value?.releaseLoadMoreLock?.()
  }
}

function scrollToGroup(key: string) {
  groupListRef.value?.scrollToGroup?.(key)
}

defineExpose({
  scrollToGroup,
  groupListRef,
})
</script>

<template>
  <div class="group-list-container" :class="props.class" :style="props.style">
    <GroupList
      ref="groupListRef"
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
      :show-avatar="props.showAvatar"
      :show-member-count="props.showMemberCount"
      :avatar-size="props.avatarSize"
      :avatar-shape="props.avatarShape"
      :item-size="props.itemSize"
      :loading="props.loading"
      :has-more="groupStore.hasMore"
      :enable-load-more="props.enableLoadMore"
      :load-more-threshold="props.loadMoreThreshold"
      :no-more-text="props.noMoreText"
      :body-sticky="props.bodySticky"
      :footer-sticky="props.footerSticky"
      @select="(g: Group) => emit('select', g)"
      @click="(g: Group) => emit('click', g)"
      @contextmenu="(e: MouseEvent, g: Group) => emit('contextmenu', e, g)"
      @load-more="handleGroupLoadMore"
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
    </GroupList>
  </div>
</template>

<style scoped>
.group-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
