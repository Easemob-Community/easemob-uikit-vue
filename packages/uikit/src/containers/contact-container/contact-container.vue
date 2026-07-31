<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Component } from 'vue'
import AddressBookContainer from '../address-book-container/address-book-container.vue'
import ContactListContainer from '../contact-list-container/contact-list-container.vue'
import GroupListContainer from '../group-list-container/group-list-container.vue'
import type {
  AddressBookContainerEntry,
  AddressBookContainerView,
} from '../address-book-container/address-book-container.vue'
import type {
  AvatarShape,
  ContactDisabledFn,
  ContactGroupBy,
  ContactItemSize,
  ContactOnlineStatusFn,
  ContactSelectMode,
  ContactSubtitleFn,
} from '../../modules/contact/types'
import type {
  GroupDisabledFn,
  GroupGroupBy,
  GroupItemSize,
  GroupSelectMode,
  GroupSortBy,
  GroupSubtitleFn,
} from '../../modules/group/types'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { ContactSortBy } from '../../composables/use-contact-sort'
import type { GroupFilterFn } from '../../composables/use-group-filter'
import type { UiContact as Contact, UiGroup as Group } from '../../sdk/types'

/** 容器视图状态（兼容旧命名） */
export type ContactContainerView = 'home' | 'group' | 'contact' | 'notice'

/** 入口标识（兼容旧命名） */
export type ContactContainerEntryKey = 'notice' | 'group' | 'contact'

/** 视图过场名称 */
export type ContactContainerTransition = 'none' | 'slide' | 'fade'

export interface ContactContainerProps {
  // ---------- 容器外观 ----------
  showHeader?: boolean
  title?: string
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否展示搜索框（向后兼容的统一开关，默认 true） */
  showSearch?: boolean
  /** 是否展示 home 视图搜索框，默认 true */
  showHomeSearch?: boolean
  /** 是否展示联系人子视图搜索框，默认 undefined（回退到 showSearch） */
  showContactSearch?: boolean
  /** 是否展示群组子视图搜索框，默认 undefined（回退到 showSearch） */
  showGroupSearch?: boolean
  showScrollToTop?: boolean
  class?: string
  style?: Record<string, string>
  transition?: ContactContainerTransition

  // ---------- 聚合入口 ----------
  /** 是否展示「通知」入口，默认 true */
  showNotice?: boolean
  /** @deprecated 请使用 showNotice */
  showNewRequest?: boolean
  showGroup?: boolean
  showContact?: boolean
  /** 「通知」徽标数量，默认 0（外部注入） */
  noticeCount?: number
  /** @deprecated 请使用 noticeCount */
  newRequestCount?: number
  groupCount?: number
  contactCount?: number
  autoEntryCount?: boolean
  entryOrder?: ContactContainerEntryKey[]
  noticeLabel?: string
  /** @deprecated 请使用 noticeLabel */
  newRequestLabel?: string
  groupLabel?: string
  contactLabel?: string
  noticeIcon?: string
  /** @deprecated 请使用 noticeIcon */
  newRequestIcon?: string
  groupIcon?: string
  contactIcon?: string
  initialView?: ContactContainerView
  /** 自定义入口列表，传入后按数组顺序展示，可与内置入口共存 */
  entries?: AddressBookContainerEntry[]
  /** 是否在联系人子视图头部展示添加好友按钮，默认 true */
  showContactAddButton?: boolean
  /** 是否在群组子视图头部展示创建群组按钮，默认 true */
  showGroupCreateButton?: boolean

  // ---------- Contact 子列表配置 ----------
  emptyText?: string
  filterFn?: ContactFilterFn
  sortBy?: ContactSortBy
  groupBy?: ContactGroupBy
  showGroupHeader?: boolean
  showAlphabetNav?: boolean
  showCount?: boolean
  selectMode?: ContactSelectMode
  selectedIds?: string[]
  maxSelected?: number
  disabledFn?: ContactDisabledFn
  subtitleFn?: ContactSubtitleFn
  onlineStatusFn?: ContactOnlineStatusFn
  showAvatar?: boolean
  avatarSize?: number
  avatarShape?: AvatarShape
  itemSize?: ContactItemSize
  loading?: boolean
  enableLoadMore?: boolean
  loadMoreThreshold?: number
  noMoreText?: string
  bodySticky?: boolean
  footerSticky?: boolean

  // ---------- 在线状态 ----------
  /** 是否展示联系人头像在线状态；不传则使用 Provider 全局 enablePresence 配置 */
  enablePresence?: boolean

  // ---------- Group 子列表配置 ----------
  groupSortBy?: GroupSortBy
  groupGroupBy?: GroupGroupBy
  groupShowGroupHeader?: boolean
  groupShowAlphabetNav?: boolean
  groupShowCount?: boolean
  groupSelectMode?: GroupSelectMode
  groupSelectedIds?: string[]
  groupMaxSelected?: number
  groupDisabledFn?: GroupDisabledFn
  groupSubtitleFn?: GroupSubtitleFn
  groupShowAvatar?: boolean
  groupShowMemberCount?: boolean
  groupAvatarSize?: number
  groupAvatarShape?: AvatarShape
  groupItemSize?: GroupItemSize
  groupLoading?: boolean
  groupEnableLoadMore?: boolean
  groupFilterFn?: GroupFilterFn
  groupEmptyText?: string
  groupNoMoreText?: string

  // ---------- 自定义搜索 ----------
  /** 联系人子视图自定义搜索组件 */
  contactSearchComponent?: Component
  /** 群组子视图自定义搜索组件 */
  groupSearchComponent?: Component

  // ---------- 自治拉取 ----------
  autoFetch?: boolean
  autoFetchGroups?: boolean
}

const props = withDefaults(defineProps<ContactContainerProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showSearch: true,
  showHomeSearch: true,
  showScrollToTop: true,
  transition: 'slide',
  // showNotice/noticeCount 不给默认值：缺省行为放到 effectiveXxx computed，
  // 让下方 ?? 链能正确回退到废弃 props（showNewRequest/newRequestCount）
  showGroup: true,
  showContact: true,
  autoEntryCount: true,
  sortBy: 'none',
  groupBy: 'alphabet',
  showGroupHeader: true,
  showAlphabetNav: true,
  showCount: false,
  selectMode: 'none',
  showAvatar: true,
  avatarShape: undefined,
  itemSize: 'normal',
  loading: false,
  enableLoadMore: true,
  loadMoreThreshold: 60,
  bodySticky: false,
  footerSticky: false,
  groupSortBy: 'none',
  groupGroupBy: 'none',
  groupShowGroupHeader: true,
  groupShowAlphabetNav: true,
  groupShowCount: false,
  groupSelectMode: 'none',
  groupShowAvatar: true,
  groupShowMemberCount: true,
  groupAvatarShape: undefined,
  groupItemSize: 'normal',
  groupLoading: false,
  groupEnableLoadMore: true,
  autoFetch: true,
  autoFetchGroups: true,
  enablePresence: undefined,
  showContactAddButton: true,
  showGroupCreateButton: true,
})

/** showNotice 缺省视为 true，兼容废弃 prop showNewRequest */
const effectiveShowNotice = computed(() => props.showNotice ?? props.showNewRequest ?? true)

/** noticeCount 缺省视为 0，兼容废弃 prop newRequestCount */
const effectiveNoticeCount = computed(() => props.noticeCount ?? props.newRequestCount ?? 0)

const emit = defineEmits<{
  (e: 'view-change', view: ContactContainerView): void
  (e: 'entry-click', key: string): void
  (e: 'notice-click'): void
  /** @deprecated 请使用 notice-click */
  (e: 'new-request-click'): void
  (e: 'home-search', keyword: string): void
  (e: 'contact-search', keyword: string): void
  (e: 'group-search', keyword: string): void
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
  (e: 'add-contact'): void
  (e: 'create-group'): void
}>()

const addressBookRef = ref<InstanceType<typeof AddressBookContainer>>()
const contactListContainerRef = ref<InstanceType<typeof ContactListContainer>>()
const groupListContainerRef = ref<InstanceType<typeof GroupListContainer>>()

const currentView = computed(() => addressBookRef.value?.view)

watch(currentView, (v) => {
  if (v !== undefined) {
    emit('view-change', v as ContactContainerView)
  }
})

function goHome() {
  addressBookRef.value?.goHome()
}
function goContact() {
  addressBookRef.value?.goContact()
}
function goGroup() {
  addressBookRef.value?.goGroup()
}
function goNotice() {
  addressBookRef.value?.goNotice()
}
function goTo(key: string) {
  addressBookRef.value?.goTo(key)
}

function scrollToGroup(key: string) {
  contactListContainerRef.value?.scrollToGroup?.(key)
  groupListContainerRef.value?.scrollToGroup?.(key)
}

defineExpose({
  view: currentView,
  goHome,
  goContact,
  goGroup,
  goNotice,
  goTo,
  setView: goTo,
  scrollToGroup,
})
</script>

<template>
  <AddressBookContainer
    ref="addressBookRef"
    :class="props.class"
    :style="props.style"
    :show-header="props.showHeader"
    :title="props.title"
    :header-align="props.headerAlign"
    :show-search="props.showHomeSearch"
    :transition="props.transition"
    :show-notice="effectiveShowNotice"
    :show-group="props.showGroup"
    :show-contact="props.showContact"
    :notice-count="effectiveNoticeCount"
    :group-count="props.groupCount"
    :contact-count="props.contactCount"
    :auto-entry-count="props.autoEntryCount"
    :entry-order="props.entryOrder"
    :notice-label="props.noticeLabel ?? props.newRequestLabel"
    :group-label="props.groupLabel"
    :contact-label="props.contactLabel"
    :notice-icon="props.noticeIcon ?? props.newRequestIcon"
    :group-icon="props.groupIcon"
    :contact-icon="props.contactIcon"
    :entries="props.entries"
    :initial-view="props.initialView as AddressBookContainerView"
    :show-contact-add-button="props.showContactAddButton"
    :show-group-create-button="props.showGroupCreateButton"
    @view-change="(v) => emit('view-change', v as ContactContainerView)"
    @entry-click="(k) => emit('entry-click', k)"
    @notice-click="() => { emit('notice-click'); emit('new-request-click') }"
    @home-search="(k) => emit('home-search', k)"
    @add-contact="emit('add-contact')"
    @create-group="emit('create-group')"
  >
    <template #header>
      <slot name="header" />
    </template>
    <template #header-extra>
      <slot name="header-extra" />
    </template>
    <template #nav="navProps">
      <slot name="nav" v-bind="navProps" />
    </template>
    <template #nav-entry="entryProps">
      <slot name="nav-entry" v-bind="entryProps" />
    </template>
    <template #nav-entry-extra="entryProps">
      <slot name="nav-entry-extra" v-bind="entryProps" />
    </template>
    <template #home-body>
      <slot name="home-body" />
    </template>
    <template #home-footer>
      <slot name="home-footer" />
    </template>
    <template #back-icon>
      <slot name="back-icon" />
    </template>
    <template v-if="$slots['subheader-extra']" #subheader-extra="subProps">
      <slot name="subheader-extra" v-bind="subProps" />
    </template>

    <template #default="{ view }">
      <!-- Contact 子视图 -->
      <ContactListContainer
        v-if="view === 'contact'"
        ref="contactListContainerRef"
        :show-header="false"
        :show-search="props.showContactSearch ?? props.showSearch"
        :show-scroll-to-top="props.showScrollToTop"
        :search-component="props.contactSearchComponent"
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
        :enable-load-more="props.enableLoadMore"
        :load-more-threshold="props.loadMoreThreshold"
        :no-more-text="props.noMoreText"
        :body-sticky="props.bodySticky"
        :footer-sticky="props.footerSticky"
        :auto-fetch="props.autoFetch"
        :enable-presence="props.enablePresence"
        @select="(c: Contact) => emit('contact-select', c)"
        @click="(c: Contact) => emit('contact-click', c)"
        @contextmenu="(e: MouseEvent, c: Contact) => emit('contact-contextmenu', e, c)"
        @load-more="emit('contact-load-more')"
        @max-exceed="(m: number) => emit('contact-max-exceed', m)"
        @update:selected-ids="(ids: string[]) => emit('update:selectedIds', ids)"
        @search="(k: string) => emit('contact-search', k)"
      >
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
        <template v-if="$slots['contact-search']" #search="slotProps">
          <slot name="contact-search" v-bind="slotProps" />
        </template>
      </ContactListContainer>

      <!-- Group 子视图 -->
      <GroupListContainer
        v-else-if="view === 'group'"
        ref="groupListContainerRef"
        :show-header="false"
        :show-search="props.showGroupSearch ?? props.showSearch"
        :show-scroll-to-top="props.showScrollToTop"
        :search-component="props.groupSearchComponent"
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
        :enable-load-more="props.groupEnableLoadMore"
        :load-more-threshold="props.loadMoreThreshold"
        :no-more-text="props.groupNoMoreText"
        :body-sticky="props.bodySticky"
        :footer-sticky="props.footerSticky"
        :auto-fetch="props.autoFetchGroups"
        @select="(g: Group) => emit('group-select', g)"
        @click="(g: Group) => emit('group-click', g)"
        @contextmenu="(e: MouseEvent, g: Group) => emit('group-contextmenu', e, g)"
        @load-more="emit('group-load-more')"
        @max-exceed="(m: number) => emit('group-max-exceed', m)"
        @update:selected-ids="(ids: string[]) => emit('update:groupSelectedIds', ids)"
        @search="(k: string) => emit('group-search', k)"
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
        <template v-if="$slots['group-search']" #search="slotProps">
          <slot name="group-search" v-bind="slotProps" />
        </template>
      </GroupListContainer>

      <!-- Notice 子视图（外部自定义内容） -->
      <div
        v-else-if="view === 'notice'"
        class="contact-container__notice-view"
      >
        <slot name="notice" />
      </div>
    </template>
  </AddressBookContainer>
</template>

<style scoped>
.contact-container__notice-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
