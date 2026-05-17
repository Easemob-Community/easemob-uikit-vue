<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import ContactList from '../../modules/contact/contact-list.vue'
import ContactNav from '../../modules/contact/contact-nav.vue'
import GroupList from '../../modules/group/group-list.vue'
import Icon from '../../components/icon/icon.vue'
import Input from '../../components/input/input.vue'
import { useLocale } from '../../locale'
import { useContact } from '../../composables/use-contact'
import { useGroup } from '../../composables/use-group'
import { useUIKit } from '../../composables/use-uikit'
import { useContactStore } from '../../store/contact'
import { useGroupStore } from '../../store/group'
import type {
  ContactGroupBy,
  ContactSelectMode,
  ContactItemSize,
  AvatarShape,
  ContactDisabledFn,
  ContactSubtitleFn,
  ContactOnlineStatusFn,
} from '../../modules/contact/types'
import type { ContactNavEntry } from '../../modules/contact/contact-nav.vue'
import type {
  GroupGroupBy,
  GroupSelectMode,
  GroupSortBy,
  GroupItemSize,
  GroupDisabledFn,
  GroupSubtitleFn,
} from '../../modules/group/types'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { ContactSortBy } from '../../composables/use-contact-sort'
import type { GroupFilterFn } from '../../composables/use-group-filter'
import type { Contact } from '../../store/contact'
import type { Group } from '../../store/group'

/** 容器视图状态 */
export type ContactContainerView = 'home' | 'group' | 'contact'

/** 入口标识 */
export type ContactContainerEntryKey = 'newRequest' | 'group' | 'contact'

/** 视图过场名称 */
export type ContactContainerTransition = 'none' | 'slide' | 'fade'

export interface ContactContainerProps {
  // ---------- 容器外观 ----------
  /** 是否展示头部，默认 true */
  showHeader?: boolean
  /** Header 标题 */
  title?: string
  /** Header 对齐方式，默认 left */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否展示搜索框（home 与子页生效），默认 true */
  showSearch?: boolean
  /** 是否展示滚动置顶按钮，默认 true */
  showScrollToTop?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
  /** 视图切换过场，默认 'slide' */
  transition?: ContactContainerTransition

  // ---------- 聚合入口 ----------
  /** 是否展示「新请求」入口，默认 true */
  showNewRequest?: boolean
  /** 是否展示「群组」入口，默认 true */
  showGroup?: boolean
  /** 是否展示「联系人」入口，默认 true */
  showContact?: boolean
  /** 「新请求」徽标数量，默认 0（外部注入） */
  newRequestCount?: number
  /** 「群组」入口右侧数量，不传默认取 store 实际数量；传 0 则不展示 */
  groupCount?: number
  /** 「联系人」入口右侧数量，不传默认取 store 实际数量；传 0 则不展示 */
  contactCount?: number
  /** 是否自动从 store 推断 groupCount/contactCount（仅未显式传入时生效），默认 true */
  autoEntryCount?: boolean
  /** 入口顺序，默认 ['newRequest', 'group', 'contact'] */
  entryOrder?: ContactContainerEntryKey[]
  /** 自定义入口标签，不传则走 i18n */
  newRequestLabel?: string
  groupLabel?: string
  contactLabel?: string
  /** 自定义入口图标 */
  newRequestIcon?: string
  groupIcon?: string
  contactIcon?: string
  /** 初始视图（默认 home） */
  initialView?: ContactContainerView

  // ---------- Contact 子列表配置 ----------
  /** 联系人空列表提示文字 */
  emptyText?: string
  /** 联系人自定义搜索过滤函数 */
  filterFn?: ContactFilterFn
  /** 联系人排序方式，默认 'none' */
  sortBy?: ContactSortBy
  /** 联系人分组方式，默认 'alphabet' */
  groupBy?: ContactGroupBy
  /** 联系人是否展示分组标题，默认 true */
  showGroupHeader?: boolean
  /** 联系人字母导航，默认 true */
  showAlphabetNav?: boolean
  /** 是否展示计数 */
  showCount?: boolean
  /** 联系人选择模式，默认 'none' */
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
  /** 联系人是否展示头像，默认 true */
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
  /** 联系人"没有更多"提示文案 */
  noMoreText?: string
  /** #body slot 是否固定不随列表滚动 */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动 */
  footerSticky?: boolean

  // ---------- Group 子列表配置 ----------
  /** 群组排序方式，默认 'none'（保持 store 顺序） */
  groupSortBy?: GroupSortBy
  /** 群组分组方式，默认 'none'（平铺） */
  groupGroupBy?: GroupGroupBy
  /** 群组是否展示分组标题（仅 groupGroupBy !== 'none' 时） */
  groupShowGroupHeader?: boolean
  /** 群组字母导航，默认 true（仅 groupGroupBy === 'alphabet' 时） */
  groupShowAlphabetNav?: boolean
  /** 群组是否展示计数 */
  groupShowCount?: boolean
  /** 群组选择模式，默认 'none' */
  groupSelectMode?: GroupSelectMode
  /** 群组受控选中 id 列表 (v-model:groupSelectedIds) */
  groupSelectedIds?: string[]
  /** 群组最大可选数量 */
  groupMaxSelected?: number
  /** 群组 disabled 判定 */
  groupDisabledFn?: GroupDisabledFn
  /** 群组副标题提取 */
  groupSubtitleFn?: GroupSubtitleFn
  /** 群组是否展示群头像，默认 true */
  groupShowAvatar?: boolean
  /** 群组是否展示成员数，默认 true */
  groupShowMemberCount?: boolean
  /** 群组头像尺寸 */
  groupAvatarSize?: number
  /** 群组头像形状 */
  groupAvatarShape?: AvatarShape
  /** 群组 Item 紧凑度 */
  groupItemSize?: GroupItemSize
  /** 群组加载态 */
  groupLoading?: boolean
  /** 群组启用触底加载 */
  groupEnableLoadMore?: boolean
  /** 群组自定义搜索过滤函数 */
  groupFilterFn?: GroupFilterFn
  /** 群组空列表提示 */
  groupEmptyText?: string
  /** 群组"没有更多"提示文案 */
  groupNoMoreText?: string

  // ---------- 自治拉取（容器自管） ----------
  /**
   * mount 时自动拉取联系人列表，默认 true。
   * 需 Provider.enableContact=true 才会生效；
   * 已加载则跳过（幂等），如需强制刷新请手动调用 useContact().refresh(true)。
   */
  autoFetch?: boolean
  /**
   * mount 时（home / group 视图）自动拉取群组列表，默认 true。
   * 已加载则跳过（幂等），如需强制刷新请手动调用 useGroup().refresh(true)。
   */
  autoFetchGroups?: boolean
}

const props = withDefaults(defineProps<ContactContainerProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showSearch: true,
  showScrollToTop: true,
  transition: 'slide',
  showNewRequest: true,
  showGroup: true,
  showContact: true,
  newRequestCount: 0,
  autoEntryCount: true,
  // Contact 子列表默认
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
  enableLoadMore: false,
  loadMoreThreshold: 60,
  bodySticky: false,
  footerSticky: false,
  // Group 子列表默认
  groupSortBy: 'none',
  groupGroupBy: 'none',
  groupShowGroupHeader: true,
  groupShowAlphabetNav: true,
  groupShowCount: false,
  groupSelectMode: 'none',
  groupShowAvatar: true,
  groupShowMemberCount: true,
  groupAvatarShape: 'rounded',
  groupItemSize: 'normal',
  groupLoading: false,
  groupEnableLoadMore: true,
  autoFetch: true,
  autoFetchGroups: true,
})

const emit = defineEmits<{
  (e: 'view-change', view: ContactContainerView): void
  (e: 'new-request-click'): void
  (e: 'home-search', keyword: string): void
  (e: 'contact-select', contact: Contact): void
  (e: 'contact-click', contact: Contact): void
  (e: 'contact-contextmenu', event: MouseEvent, contact: Contact): void
  (e: 'contact-load-more'): void
  (e: 'contact-max-exceed', max: number): void
  (e: 'update:selectedIds', ids: string[]): void
  (e: 'group-select', group: Group): void
  (e: 'group-click', group: Group): void
  (e: 'group-contextmenu', event: MouseEvent, group: Group): void
  (e: 'group-load-more'): void
  (e: 'group-max-exceed', max: number): void
  (e: 'update:groupSelectedIds', ids: string[]): void
}>()

const { t } = useLocale()

const { contactList, refresh: refreshContacts } = useContact()
const { groupList, refresh: refreshGroups, loadMore: loadMoreGroups, joinedGroupCount, fetchJoinedGroupCount } = useGroup()
const { features } = useUIKit()
const contactStore = useContactStore()
const groupStore = useGroupStore()

/** 自治拉取：根据当前视图按需触发 */
function maybeFetchContacts() {
  if (!props.autoFetch) return
  if (!features.enableContact) return
  if (contactStore.loaded) return
  refreshContacts()
}
function maybeFetchGroups() {
  if (!props.autoFetchGroups) return
  if (groupStore.loaded) return
  refreshGroups()
}

/** home 视图下轻量获取群组总数（不拉取完整列表） */
function maybeFetchGroupCount() {
  if (!props.autoFetchGroups) return
  fetchJoinedGroupCount()
}

onMounted(() => {
  // home 视图通常需要 contact / group 数量；group/contact 子视图按需
  if (view.value === 'home') {
    if (props.showContact) maybeFetchContacts()
    if (props.showGroup) {
      maybeFetchGroupCount()
      maybeFetchGroups()
    }
  } else if (view.value === 'group') {
    maybeFetchGroups()
  } else if (view.value === 'contact') {
    maybeFetchContacts()
  }
})

const enabledCount = computed(() => {
  return [props.showNewRequest, props.showGroup, props.showContact].filter(Boolean).length
})

/** 是否启用 drilldown 多视图模式（>1 个入口启用） */
const isDrilldown = computed(() => enabledCount.value > 1)

function resolveInitialView(): ContactContainerView {
  if (props.initialView) return props.initialView
  // 单入口降级：仅 contact 启用 -> 直接 contact；仅 group 启用 -> 直接 group
  if (props.showContact && !props.showGroup && !props.showNewRequest) return 'contact'
  if (props.showGroup && !props.showContact && !props.showNewRequest) return 'group'
  return 'home'
}

const view = ref<ContactContainerView>(resolveInitialView())

// 入口配置可见性变化时，重新评估视图
watch(
  () => [props.showContact, props.showGroup, props.showNewRequest, props.initialView] as const,
  () => {
    view.value = resolveInitialView()
  },
)

watch(view, (v) => {
  emit('view-change', v)
  // 切换到子视图时按需拉取（幂等，已加载则跳过）
  if (v === 'group') maybeFetchGroups()
  else if (v === 'contact') maybeFetchContacts()
})

const homeSearchKeyword = ref('')
watch(homeSearchKeyword, (v) => emit('home-search', v))

// ---------- 入口列表 ----------
const resolvedGroupCount = computed(() => {
  if (props.groupCount !== undefined) return props.groupCount
  if (!props.autoEntryCount) return 0
  // home 视图优先使用轻量接口返回的总数，子视图或 fallback 用列表长度
  if (view.value === 'home') {
    return joinedGroupCount.value || groupList.value.length
  }
  return groupList.value.length
})
const resolvedContactCount = computed(() => {
  if (props.contactCount !== undefined) return props.contactCount
  return props.autoEntryCount ? contactList.value.length : 0
})

const navEntries = computed<ContactNavEntry[]>(() => {
  const order = props.entryOrder ?? (['newRequest', 'group', 'contact'] as const)
  const map: Record<ContactContainerEntryKey, ContactNavEntry> = {
    newRequest: {
      key: 'newRequest',
      label: props.newRequestLabel || t('contact.entryNewRequest'),
      count: props.newRequestCount,
      icon: props.newRequestIcon,
      visible: props.showNewRequest,
    },
    group: {
      key: 'group',
      label: props.groupLabel || t('contact.entryGroup'),
      count: resolvedGroupCount.value,
      icon: props.groupIcon,
      visible: props.showGroup,
    },
    contact: {
      key: 'contact',
      label: props.contactLabel || t('contact.entryContact'),
      count: resolvedContactCount.value,
      icon: props.contactIcon,
      visible: props.showContact,
    },
  }
  return order.map((k) => map[k]).filter(Boolean)
})

function onEntryClick(key: string) {
  if (key === 'newRequest') {
    emit('new-request-click')
    return
  }
  if (key === 'group') {
    view.value = 'group'
    return
  }
  if (key === 'contact') {
    view.value = 'contact'
  }
}

/** 处理群组触底加载更多 */
async function handleGroupLoadMore() {
  try {
    await loadMoreGroups()
  } finally {
    groupListRef.value?.releaseLoadMoreLock?.()
  }
}

// ---------- 命令式 API ----------
function goHome() {
  view.value = 'home'
}
function goGroup() {
  view.value = 'group'
}
function goContact() {
  view.value = 'contact'
}

// ---------- 子列表 ref（暴露 scrollToGroup 等） ----------
const contactListRef = ref<InstanceType<typeof ContactList>>()
const groupListRef = ref<InstanceType<typeof GroupList>>()

function scrollToGroup(key: string) {
  if (view.value === 'contact') {
    contactListRef.value?.scrollToGroup?.(key)
  } else if (view.value === 'group') {
    groupListRef.value?.scrollToGroup?.(key)
  }
}

defineExpose({
  view,
  goHome,
  goGroup,
  goContact,
  scrollToGroup,
})

// ---------- 子页头部相关 ----------
const subviewTitle = computed(() => {
  if (view.value === 'group') return props.groupLabel || t('contact.entryGroup')
  if (view.value === 'contact') return props.contactLabel || t('contact.entryContact')
  return ''
})
</script>

<template>
  <div class="contact-container" :class="props.class" :style="props.style">
    <Transition
      :name="`contact-container-${props.transition}`"
      :duration="props.transition === 'none' ? 0 : 220"
      mode="out-in"
    >
      <div :key="view" class="contact-container__view">
        <!-- ===================== Home 视图 ===================== -->
        <template v-if="view === 'home'">
          <div
            v-if="props.showHeader"
            class="contact-container__header"
            :class="`contact-container__header--${props.headerAlign}`"
          >
            <slot name="header">
              <span class="contact-container__title">
                {{ props.title || t('contact.title') }}
              </span>
            </slot>
            <span v-if="$slots['header-extra']" class="contact-container__header-extra">
              <slot name="header-extra" />
            </span>
          </div>

          <div v-if="props.showSearch" class="contact-container__search">
            <Input
              v-model="homeSearchKeyword"
              :placeholder="t('contact.searchPlaceholder')"
              prefix-icon="misc/magnifier2"
            />
          </div>

          <div class="contact-container__nav-wrap">
            <slot name="nav" :entries="navEntries" :on-entry-click="onEntryClick">
              <ContactNav :entries="navEntries" @entry-click="onEntryClick">
                <template v-if="$slots['nav-entry']" #entry="entrySlotProps">
                  <slot name="nav-entry" v-bind="entrySlotProps" />
                </template>
              </ContactNav>
            </slot>
            <div v-if="$slots['home-body']" class="contact-container__home-body">
              <slot name="home-body" />
            </div>
          </div>

          <div v-if="$slots['home-footer']" class="contact-container__home-footer">
            <slot name="home-footer" />
          </div>
        </template>

        <!-- ===================== Group 子视图 ===================== -->
        <template v-else-if="view === 'group'">
          <div
            v-if="isDrilldown && props.showHeader"
            class="contact-container__subheader"
          >
            <span class="contact-container__back" @click="goHome">
              <slot name="back-icon">
                <Icon name="navigation/chevron_left" :size="20" />
              </slot>
            </span>
            <span class="contact-container__subtitle">{{ subviewTitle }}</span>
            <span class="contact-container__subheader-extra">
              <slot name="subheader-extra" :view="view" />
            </span>
          </div>

          <GroupList
            ref="groupListRef"
            class="contact-container__list"
            :show-header="!isDrilldown && props.showHeader"
            :title="props.groupLabel || t('contact.entryGroup')"
            :header-align="props.headerAlign"
            :show-search="props.showSearch"
            :show-scroll-to-top="props.showScrollToTop"
            :show-count="props.groupShowCount"
            :empty-text="props.groupEmptyText"
            :filter-fn="props.groupFilterFn"
            :sort-by="props.groupSortBy"
            :group-by="props.groupGroupBy"
            :show-group-header="props.groupShowGroupHeader"
            :show-alphabet-nav="props.groupShowAlphabetNav"
            :select-mode="props.groupSelectMode"
            :selected-ids="props.groupSelectedIds"
            :max-selected="props.groupMaxSelected"
            :disabled-fn="props.groupDisabledFn"
            :subtitle-fn="props.groupSubtitleFn"
            :show-avatar="props.groupShowAvatar"
            :show-member-count="props.groupShowMemberCount"
            :avatar-size="props.groupAvatarSize"
            :avatar-shape="props.groupAvatarShape"
            :item-size="props.groupItemSize"
            :loading="props.groupLoading"
            :has-more="groupStore.hasMore"
            :enable-load-more="props.groupEnableLoadMore"
            :load-more-threshold="props.loadMoreThreshold"
            :no-more-text="props.groupNoMoreText"
            :body-sticky="props.bodySticky"
            :footer-sticky="props.footerSticky"
            @select="(g: Group) => emit('group-select', g)"
            @click="(g: Group) => emit('group-click', g)"
            @contextmenu="(e: MouseEvent, g: Group) => emit('group-contextmenu', e, g)"
            @load-more="handleGroupLoadMore"
            @max-exceed="(m: number) => emit('group-max-exceed', m)"
            @update:selected-ids="(ids: string[]) => emit('update:groupSelectedIds', ids)"
          >
            <template v-if="$slots['group-body']" #body>
              <slot name="group-body" />
            </template>
            <template v-if="$slots['group-footer']" #footer>
              <slot name="group-footer" />
            </template>
            <template v-if="$slots['group-loading']" #loading>
              <slot name="group-loading" />
            </template>
            <template v-if="$slots['group-loading-more']" #loading-more>
              <slot name="group-loading-more" />
            </template>
            <template v-if="$slots['group-no-more']" #no-more>
              <slot name="group-no-more" />
            </template>
            <template v-if="$slots['group-empty']" #empty="slotProps">
              <slot name="group-empty" v-bind="slotProps" />
            </template>
            <template v-if="$slots['group-group-header']" #group-header="slotProps">
              <slot name="group-group-header" v-bind="slotProps" />
            </template>
            <template v-if="$slots['group-item']" #item="slotProps">
              <slot name="group-item" v-bind="slotProps" />
            </template>
          </GroupList>
        </template>

        <!-- ===================== Contact 子视图 ===================== -->
        <template v-else-if="view === 'contact'">
          <div
            v-if="isDrilldown && props.showHeader"
            class="contact-container__subheader"
          >
            <span class="contact-container__back" @click="goHome">
              <slot name="back-icon">
                <Icon name="navigation/chevron_left" :size="20" />
              </slot>
            </span>
            <span class="contact-container__subtitle">{{ subviewTitle }}</span>
            <span class="contact-container__subheader-extra">
              <slot name="subheader-extra" :view="view" />
            </span>
          </div>

          <ContactList
            ref="contactListRef"
            class="contact-container__list"
            :show-header="!isDrilldown && props.showHeader"
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
            :has-more="true"
            :enable-load-more="props.enableLoadMore"
            :load-more-threshold="props.loadMoreThreshold"
            :no-more-text="props.noMoreText"
            :body-sticky="props.bodySticky"
            :footer-sticky="props.footerSticky"
            @select="(c: Contact) => emit('contact-select', c)"
            @click="(c: Contact) => emit('contact-click', c)"
            @contextmenu="(e: MouseEvent, c: Contact) => emit('contact-contextmenu', e, c)"
            @load-more="() => emit('contact-load-more')"
            @max-exceed="(m: number) => emit('contact-max-exceed', m)"
            @update:selected-ids="(ids: string[]) => emit('update:selectedIds', ids)"
          >
            <template v-if="$slots.header && !isDrilldown" #header>
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
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.contact-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
  overflow: hidden;
}

.contact-container__view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ===== 视图过场 ===== */
.contact-container-slide-enter-active,
.contact-container-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.contact-container-slide-enter-from {
  transform: translateX(8%);
  opacity: 0;
}
.contact-container-slide-leave-to {
  transform: translateX(-8%);
  opacity: 0;
}
.contact-container-fade-enter-active,
.contact-container-fade-leave-active {
  transition: opacity 0.18s ease;
}
.contact-container-fade-enter-from,
.contact-container-fade-leave-to {
  opacity: 0;
}
.contact-container-none-enter-active,
.contact-container-none-leave-active {
  transition: none;
}

.contact-container__header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.contact-container__header--center {
  justify-content: center;
}

.contact-container__header--right {
  flex-direction: row-reverse;
}

.contact-container__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.contact-container__search {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.contact-container__nav-wrap {
  flex: 1;
  overflow-y: auto;
}

.contact-container__home-body {
  padding: 0 16px;
}

.contact-container__home-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.contact-container__header-extra {
  display: inline-flex;
  align-items: center;
}

.contact-container__subheader {
  position: relative;
  padding: 12px 48px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.contact-container__back {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--uikit-text-primary);
  transition: background-color 0.15s;
}

.contact-container__back:hover {
  background-color: var(--uikit-bg-secondary);
}

.contact-container__subtitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.contact-container__subheader-extra {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
}

.contact-container__list {
  flex: 1;
  min-height: 0;
}
</style>
