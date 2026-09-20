<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import type { Component } from 'vue'
import { useContact } from '../../composables/use-contact'
import { useBlocklist } from '../../composables/use-blocklist'
import { useContactFilter } from '../../composables/use-contact-filter'
import { useContactGroup } from '../../composables/use-contact-group'
import { useContactSort } from '../../composables/use-contact-sort'
import { useViewport } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { usePresence } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useArrowNavigation, useEscToClose, useKeyBindings } from '@easemob/uikit-core'
import { EmInput as Input } from '@easemob/uikit-core'
import { EmScrollToTop as ScrollToTop } from '@easemob/uikit-core'
import { EmSkeleton as Skeleton } from '@easemob/uikit-core'
import type { ContactFilterFn } from '../../composables/use-contact-filter'
import type { ContactSortBy } from '../../composables/use-contact-sort'
import type { UiContact as Contact } from '@easemob/uikit-core'
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
  /** 是否过滤掉已拉黑用户，默认 false（好友列表容器按 Provider 配置开启，选人弹窗复用不受影响） */
  filterBlockedContacts?: boolean
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
  /** 多选选择框位置：left（默认，头像前）/ right（行尾） */
  checkboxPosition?: 'left' | 'right'
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
  /**
   * 是否展示联系人头像在线状态，默认 false（即使 Provider 全局开启在线状态链路，好友列表也默认不展示，
   * 需显式传 true 开启；数据订阅随之启用）。传 onlineStatusFn 时本开关不生效。
   * Whether to show presence dots on contact avatars. Default false — the contact list stays
   * presence-free unless explicitly enabled, regardless of the global enablePresence feature.
   */
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
  checkboxPosition: 'left',
  showAvatar: true,
  avatarShape: undefined,
  itemSize: 'normal',
  loading: false,
  hasMore: true,
  loadMoreThreshold: 60,
  enableLoadMore: false,
  bodySticky: false,
  footerSticky: false,
  clickBehavior: 'default',
  filterBlockedContacts: false,
})

const emit = defineEmits<{
  (e: 'select', contact: Contact): void
  (e: 'click', contact: Contact): void
  (e: 'contextmenu', event: MouseEvent, contact: Contact): void
  (e: 'group-jump', key: string): void
  (e: 'update:selectedIds', ids: string[]): void
  (e: 'max-exceed', max: number): void
  (e: 'load-more'): void
  (e: 'search', keyword: string): void
}>()

const {
  contactList,
  selectedIds: storeSelectedIds,
  setSelectedIds,
  setActiveId,
} = useContact()
const { t } = useLocale()
const { isBlocked } = useBlocklist()
const { isMobile } = useViewport()
void isMobile

// ================== Presence 默认兑底 ==================
// 默认关闭：好友列表属于扫读场景，即使 Provider 全局开启在线状态链路也不展示状态点，
// 需组件显式传 enablePresence=true（或传 onlineStatusFn 完全接管）才启用；
// 启用时内部使用 usePresence 提供在线状态，并按过滤后的可见联系人 ID 自动订阅。
const { features, stores, domains } = useUIKit()
const presenceEnabled = computed(
  () => (props.enablePresence ?? false) && !props.onlineStatusFn,
)
const presence = usePresence()

const itemsRef = ref<HTMLElement>()
/** 触底加载本地锁，防止异步请求期间重复触发 */
const isLoadingMore = ref(false)
/** 当前可视区域的分组 key，用于字母导航高亮 */
const activeGroupKey = ref('')
// 搜索关键词为组件本地状态：contact-list 被通讯录容器与多个弹窗复用，
// 写 store 会让 A 弹窗的搜索词残留到 B，故默认不共享
const searchKeyword = ref('')
function setSearchKeyword(v: string) {
  searchKeyword.value = v
  emit('search', v.trim())
}
const normalizedKeyword = computed(() => searchKeyword.value.trim())

/** 排序 + 过滤 + 分组 流水线 */
const sortByRef = computed(() => props.sortBy)
const groupByRef = computed(() => props.groupBy)

/** 原始联系人列表：仅好友列表场景按 Provider 配置过滤掉已拉黑用户；选人弹窗复用时不开启，保持完整列表 */
const baseContactList = computed(() => {
  if (!props.filterBlockedContacts)
    return contactList.value
  return contactList.value.filter(c => !isBlocked(c.userId))
})

const sortedContacts = useContactSort(baseContactList, sortByRef)
const filteredContacts = useContactFilter(sortedContacts, searchKeyword, {
  filterFn: props.filterFn,
})
const groupedContacts = useContactGroup(filteredContacts, groupByRef)

// 批量预取可见联系人的用户资料昵称：列表项展示、搜索过滤、字母分组都消费 userInfo 昵称，
// 行级 useUserInfo 是单条拉取，进入页面立即搜索时数据可能未回，这里对整页批量补拉
watchEffect(() => {
  if (features.enableUserInfo === false)
    return
  const missing = baseContactList.value
    .map(c => c.userId)
    .filter(id =>
      id
      && !stores.userInfo.getUserInfo(id)
      && !stores.userInfo.isLoading(id)
      && !stores.userInfo.isFetchFailed(id),
    )
  if (missing.length > 0)
    void domains.userInfo.fetchUserInfos(missing)
})

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
  if (!presenceEnabled.value)
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

// 分组数据变化时初始化当前分组高亮：短列表不会触发滚动事件，
// activeGroupKey 需要在这里兜底（否则字母导航的选中高亮始终不显示）
watch(
  () => groupedContacts.value,
  (groups) => {
    if (isAlphabet.value && props.showAlphabetNav && groups.length > 0)
      activeGroupKey.value = groups[0].key
    else
      activeGroupKey.value = ''
  },
  { immediate: true },
)

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
  // 避免残留到下一个复用 contact-list 的容器/弹窗（弹窗在提交时已读取选中，清理发生在其后）
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
  // 短列表不触发滚动事件，高亮需在此处同步
  activeGroupKey.value = key
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

/** 用于方向键导航的平铺联系人列表（跳过分组标题） */
const navigableContacts = computed(() =>
  groupedContacts.value.flatMap(group => group.items),
)

const { activeIndex } = useArrowNavigation({
  count: computed(() => navigableContacts.value.length),
  wrap: true,
  active: keyboardNavActive,
  // 搜索框聚焦时方向键让位给输入光标
  ignoreWhenTyping: true,
  disabled: index => props.disabledFn ? props.disabledFn(navigableContacts.value[index]) : false,
  onActiveChange: (index) => {
    const contact = navigableContacts.value[index]
    if (contact) {
      setActiveId(contact.userId)
      scrollContactIntoView(contact.userId)
      nextTick(() => itemsRef.value?.focus())
    }
  },
})

/** Enter 选中当前键盘高亮的联系人 */
useKeyBindings({
  Enter: () => {
    const contact = navigableContacts.value[activeIndex.value]
    if (contact && !(props.disabledFn && props.disabledFn(contact)))
      onItemClick(contact)
  },
}, {
  active: keyboardNavActive,
  ignoreWhenTyping: true,
})

/** 将目标联系人滚动进可视区 */
function scrollContactIntoView(userId: string) {
  nextTick(() => {
    const el = itemsRef.value?.querySelector<HTMLElement>(`[data-userid="${userId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
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
          :placeholder="t('contact.searchPlaceholder')"
          prefix-icon="search"
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

    <!-- 列表滚动区：字母导航相对本区域垂直居中，避免上探与搜索框重合 -->
    <div class="contact-list__items-area">
      <div
        ref="itemsRef"
        tabindex="0"
        class="contact-list__items"
        @mouseenter="enableKeyboardNav"
        @mouseleave="disableKeyboardNav"
        @click="enableKeyboardNav"
      >
      <!-- body slot - 非 sticky 模式 -->
      <div v-if="$slots.body && !props.bodySticky" class="contact-list__body">
        <slot name="body" />
      </div>

      <!-- loading（有数据时也展示在顶部覆盖；无数据时占位）：默认骨架屏 -->
      <div
        v-if="props.loading && groupedContacts.length === 0"
        class="contact-list__loading-wrap"
      >
        <slot name="loading">
          <div class="contact-list__skeleton">
            <div v-for="i in 8" :key="i" class="contact-list__skeleton-item">
              <Skeleton variant="avatar" shape="rounded" />
              <div class="contact-list__skeleton-lines">
                <Skeleton variant="text" style="width: 35%;" />
                <Skeleton variant="text" style="width: 65%;" />
              </div>
            </div>
          </div>
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
            :checkbox-position="props.checkboxPosition"
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

      <!-- 字母导航 -->
      <ContactAlphabetNav
        v-if="isAlphabet && props.showAlphabetNav && groupedContacts.length > 0"
        :groups="(groupedContacts as ContactGroupItem[])"
        :active-key="activeGroupKey"
        @jump="scrollToGroup"
      />
    </div>

    <!-- footer slot - sticky 模式 -->
    <div
      v-if="$slots.footer && props.footerSticky"
      class="contact-list__footer contact-list__footer--sticky"
    >
      <slot name="footer" />
    </div>

    <!-- 滚动置顶 -->
    <ScrollToTop
      v-if="props.showScrollToTop"
      :target="itemsRef ?? undefined"
      :visibility-height="200"
      :bottom="12"
      :right="12"
    />

    <!-- 水印覆盖层（#watermark：用户注入水印内容，铺满整个列表区，不响应交互） -->
    <div v-if="$slots.watermark" class="contact-list__watermark">
      <slot name="watermark" />
    </div>
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

/* 水印覆盖层：铺满列表区，穿透事件；层级与内容浮层一致，低于弹窗 */
.contact-list__watermark {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
}

/* 与会话列表 card 变体同一口径：头部左缘对齐项 hover 背景边缘（rounded 档）/ 项内容左缘（default 档）；
   border-box 总高统一 56px */
.contact-list__header {
  box-sizing: border-box;
  padding: 12px calc(4px + var(--uikit-item-hover-padding-x, 16px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
}

.contact-list__header--center {
  justify-content: center;
}

.contact-list__header--right {
  flex-direction: row-reverse;
}

.contact-list__title {
  font-size: var(--uikit-font-size-16);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-primary);
}

.contact-list__count {
  margin-left: 6px;
  font-size: var(--uikit-font-size-11);
  font-weight: var(--uikit-font-weight-regular);
  color: var(--uikit-text-secondary);
}

/* 设计稿（新 Demo 联系人页）：搜索栏容器 px-12 py-8 */
.contact-list__search {
  padding: 8px 12px;
}

.contact-list__items-area {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  /* 字母导航等比压缩的兜底：超高时裁剪在列表区内，不侵入搜索区 */
  overflow: hidden;
}

.contact-list__items {
  flex: 1;
  overflow-y: auto;
  position: relative;
  outline: none;
  /* 与会话列表 card 变体一致的可视区内边距（4px）；
     设计稿（新 Demo 联系人页）：项内容水平内边距 12px、64px 行高 = 48 头像 + 8px 上下 padding */
  padding: 4px;
  --uikit-item-hover-padding-x: 12px;
  --uikit-cell-padding-y: 8px;
  --uikit-cell-gap: 4px;
}

/* 与会话列表 card 变体一致：hover/active 背景顶满整个 cell，不再二次内缩 */
.contact-list__items :deep(.uikit-cell.is-inset-hover)::before {
  inset: 0;
}

/* 分组标题顶满列表可视区（负 margin 抵消 items 容器 4px 内边距），
   文字与列表项内容左缘对齐（= 4px 容器内边距 + cell margin-x + cell padding-x）。
   设计稿：28px 高、12px/500、弱化灰；sticky 需不透明底色避免滚动穿透 */
.contact-list__group-header {
  margin: 0 -4px;
  padding: 0 calc(4px + var(--uikit-item-hover-margin-x, 0px) + var(--uikit-item-hover-padding-x, 16px));
  height: 28px;
  display: flex;
  align-items: center;
  font-size: var(--uikit-font-size-11);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-tertiary);
  background-color: var(--uikit-bg-base);
  position: sticky;
  top: 0;
  z-index: 1;
}

.contact-list__body {
  padding: 0 calc(4px + var(--uikit-item-hover-margin-x, 0px) + var(--uikit-item-hover-padding-x, 16px));
}

.contact-list__body--sticky {
  flex-shrink: 0;
}

.contact-list__footer {
  padding: 8px calc(4px + var(--uikit-item-hover-margin-x, 0px) + var(--uikit-item-hover-padding-x, 16px));
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
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.contact-list__skeleton {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 骨架头像与真实列表项内容左缘对齐（items 容器已有 4px 内边距） */
  padding: 8px calc(var(--uikit-item-hover-margin-x, 0px) + var(--uikit-item-hover-padding-x, 16px));
}

.contact-list__skeleton-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contact-list__skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
}
</style>
