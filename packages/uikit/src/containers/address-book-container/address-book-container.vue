<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import ContactNav from '../../modules/contact/contact-nav.vue'
import ContactNoticeList from '../../modules/contact/contact-notice-list.vue'
import Icon from '../../components/icon/icon.vue'
import Input from '../../components/input/input.vue'
import { useLocale } from '../../locale'
import { useContact } from '../../composables/use-contact'
import { useGroup } from '../../composables/use-group'
import { useUIKit } from '../../composables/use-uikit'
import { useInvitePersistence } from '../../composables/use-invite-persistence'
import { useContactStore } from '../../store/contact'
import { useGroupStore } from '../../store/group'
import type { ContactNavEntry } from '../../modules/contact/contact-nav.vue'

/** 容器视图状态 */
export type AddressBookContainerView = 'home' | 'contact' | 'group' | 'notice' | string

/** 入口项配置 */
export interface AddressBookContainerEntry {
  /** 入口唯一标识 */
  key: string
  /** 入口标签文本 */
  label: string
  /** 右侧数量徽标，0 时不展示 */
  count?: number
  /** 入口图标名（icon-map 中的 name） */
  icon?: string
  /** 是否可见，false 时不渲染该卡片，默认 true */
  visible?: boolean
  /** 是否自动跳转视图，false 时仅触发 entry-click 事件，由外部自行处理，默认 true */
  to?: boolean
  /** 排序权重，数值越小越靠前；未设置时按数组原始顺序，设置了则全局按 sort 升序排列 */
  sort?: number
}

/** 入口标识 */
export type AddressBookContainerEntryKey = string

/** 视图过场名称 */
export type AddressBookContainerTransition = 'none' | 'slide' | 'fade'

export interface AddressBookContainerProps {
  // ---------- 容器外观 ----------
  /** 是否展示头部，默认 true */
  showHeader?: boolean
  /** Header 标题 */
  title?: string
  /** Header 对齐方式，默认 left */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否展示搜索框（home 生效），默认 true */
  showSearch?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
  /** 视图切换过场，默认 'slide' */
  transition?: AddressBookContainerTransition

  // ---------- 聚合入口 ----------
  /** 自定义入口列表，传入后按数组顺序展示，可与内置入口共存 */
  entries?: AddressBookContainerEntry[]
  /** 是否展示「通知」入口，默认 true */
  showNotice?: boolean
  /** 是否展示「群组」入口，默认 true（Provider.enableGroup=false 时强制隐藏） */
  showGroup?: boolean
  /** 是否展示「联系人」入口，默认 true */
  showContact?: boolean
  /** 「通知」徽标数量，默认 0（外部注入） */
  noticeCount?: number
  /** 「群组」入口右侧数量，不传默认取 store 实际数量；传 0 则不展示 */
  groupCount?: number
  /** 「联系人」入口右侧数量，不传默认取 store 实际数量；传 0 则不展示 */
  contactCount?: number
  /** 是否自动从 store 推断 groupCount/contactCount（仅未显式传入时生效），默认 true */
  autoEntryCount?: boolean
  /** 入口顺序，默认 ['notice', 'group', 'contact'] */
  entryOrder?: AddressBookContainerEntryKey[]
  /** 自定义入口标签，不传则走 i18n */
  noticeLabel?: string
  groupLabel?: string
  contactLabel?: string
  /** 自定义入口图标 */
  noticeIcon?: string
  groupIcon?: string
  contactIcon?: string
  /** 是否持久化未处理通知（好友申请 + 群邀请），开启后首页徽标在刷新后也能立即显示红点 */
  noticePersistInvites?: boolean | 'local' | 'session'
  /** 初始视图（默认 home） */
  initialView?: AddressBookContainerView
}

const props = withDefaults(defineProps<AddressBookContainerProps>(), {
  showHeader: true,
  headerAlign: 'left',
  showSearch: true,
  transition: 'slide',
  showNotice: true,
  showGroup: true,
  showContact: true,
  noticeCount: 0,
  autoEntryCount: true,
  entryOrder: () => ['notice', 'group', 'contact'] as const,
  noticePersistInvites: false,
})

const emit = defineEmits<{
  (e: 'view-change', view: AddressBookContainerView): void
  (e: 'notice-click'): void
  (e: 'entry-click', key: string): void
  (e: 'home-search', keyword: string): void
}>()

const { t } = useLocale()

useInvitePersistence(computed(() => props.noticePersistInvites))

const { contactList, contactCount: contactStoreCount, fetchContactCount } = useContact()
const { groupList, joinedGroupCount: groupStoreCount, fetchJoinedGroupCount } = useGroup()
const { features, stores } = useUIKit()
const contactStore = useContactStore()
const groupStore = useGroupStore()

/** 群组能力是否启用（Provider 层冻结） */
const groupEnabled = computed(() => features.enableGroup !== false)

const view = ref<AddressBookContainerView>(resolveInitialView())

/** home 视图下轻量获取好友总数（不拉取完整列表） */
function maybeFetchContactCount() {
  fetchContactCount()
}

/** home 视图下轻量获取群组总数（不拉取完整列表） */
function maybeFetchGroupCount() {
  fetchJoinedGroupCount()
}

onMounted(() => {
  if (view.value === 'home') {
    if (props.showContact) {
      maybeFetchContactCount()
    }
    if (props.showGroup) {
      maybeFetchGroupCount()
    }
  }
})

const enabledCount = computed(() => {
  const builtIn = [props.showNotice, props.showGroup, props.showContact].filter(Boolean).length
  const custom = (props.entries ?? []).filter((e) => e.visible !== false).length
  return builtIn + custom
})

/** 是否启用 drilldown 多视图模式（>1 个入口启用） */
const isDrilldown = computed(() => enabledCount.value > 1)

function resolveInitialView(): AddressBookContainerView {
  if (props.initialView) return props.initialView
  // 单入口降级（仅内置入口）
  const customVisible = (props.entries ?? []).filter((e) => e.visible !== false)
  if (customVisible.length === 1 && !props.showContact && !props.showGroup && !props.showNotice) {
    return customVisible[0].key
  }
  if (props.showContact && !props.showGroup && !props.showNotice) return 'contact'
  if (props.showGroup && !props.showContact && !props.showNotice) return 'group'
  if (props.showNotice && !props.showContact && !props.showGroup) return 'notice'
  return 'home'
}

watch(
  () => [props.showContact, props.showGroup, props.showNotice, props.initialView] as const,
  () => {
    view.value = resolveInitialView()
  },
)

watch(view, (v) => {
  emit('view-change', v)
})

const homeSearchKeyword = ref('')
watch(homeSearchKeyword, (v) => emit('home-search', v))

// ---------- 入口列表 ----------
const resolvedGroupCount = computed(() => {
  if (props.groupCount !== undefined) return props.groupCount
  if (!props.autoEntryCount) return 0
  if (view.value === 'home') {
    return groupStoreCount.value || groupList.value.length
  }
  return groupList.value.length
})
const resolvedContactCount = computed(() => {
  if (props.contactCount !== undefined) return props.contactCount
  if (!props.autoEntryCount) return 0
  if (view.value === 'home') {
    return contactStoreCount.value || contactList.value.length
  }
  return contactList.value.length
})

const resolvedNoticeCount = computed(() => {
  if (props.noticeCount !== undefined) return props.noticeCount
  if (!props.autoEntryCount) return 0
  return stores.contact.pendingCount
})

type NavEntryWithSort = ContactNavEntry & { sort?: number }

const navEntries = computed<ContactNavEntry[]>(() => {
  const order = props.entryOrder ?? (['notice', 'group', 'contact'] as const)
  const map: Record<string, ContactNavEntry> = {
    notice: {
      key: 'notice',
      label: props.noticeLabel || t('contact.entryNotice'),
      count: resolvedNoticeCount.value,
      hot: resolvedNoticeCount.value > 0,
      icon: props.noticeIcon,
      visible: props.showNotice,
    },
    group: {
      key: 'group',
      label: props.groupLabel || t('contact.entryGroup'),
      count: resolvedGroupCount.value,
      icon: props.groupIcon,
      visible: props.showGroup && groupEnabled.value,
    },
    contact: {
      key: 'contact',
      label: props.contactLabel || t('contact.entryContact'),
      count: resolvedContactCount.value,
      icon: props.contactIcon,
      visible: props.showContact,
    },
  }
  const builtInEntries = order.map((k) => map[k]).filter((e): e is ContactNavEntry => Boolean(e))
  const customEntries: NavEntryWithSort[] = (props.entries ?? []).map((e) => ({
    key: e.key,
    label: e.label,
    count: e.count,
    icon: e.icon,
    visible: e.visible !== false,
    sort: e.sort,
  }))
  const all: NavEntryWithSort[] = [...builtInEntries, ...customEntries]
  const hasSort = all.some((e) => typeof e.sort === 'number')
  if (hasSort) {
    return [...all].sort((a, b) => {
      const sa = typeof a.sort === 'number' ? a.sort : Infinity
      const sb = typeof b.sort === 'number' ? b.sort : Infinity
      return sa - sb
    })
  }
  return all
})

function onEntryClick(key: string) {
  emit('entry-click', key)
  if (key === 'notice') {
    emit('notice-click')
  }
  // 自定义入口若声明了 to = false，则仅触发事件，不自动跳转视图
  const custom = (props.entries ?? []).find((e) => e.key === key)
  if (custom && custom.to === false) {
    return
  }
  view.value = key
}

// ---------- 命令式 API ----------
function goHome() {
  view.value = 'home'
}
function goContact() {
  view.value = 'contact'
}
function goGroup() {
  view.value = 'group'
}
function goNotice() {
  view.value = 'notice'
}
function goTo(key: string) {
  view.value = key
}

defineExpose({
  view,
  goHome,
  goContact,
  goGroup,
  goNotice,
  goTo,
})

// ---------- 子页头部相关 ----------
const subviewTitle = computed(() => {
  if (view.value === 'group') return props.groupLabel || t('contact.entryGroup')
  if (view.value === 'contact') return props.contactLabel || t('contact.entryContact')
  if (view.value === 'notice') return props.noticeLabel || t('contact.entryNotice')
  const custom = (props.entries ?? []).find((e) => e.key === view.value)
  if (custom) return custom.label
  return ''
})
</script>

<template>
  <div class="address-book-container" :class="props.class" :style="props.style">
    <Transition
      :name="`address-book-container-${props.transition}`"
      mode="out-in"
    >
      <div :key="view" class="address-book-container__view">
        <!-- ===================== Home 视图 ===================== -->
        <template v-if="view === 'home'">
          <div
            v-if="props.showHeader"
            class="address-book-container__header"
            :class="`address-book-container__header--${props.headerAlign}`"
          >
            <slot name="header">
              <span class="address-book-container__title">
                {{ props.title || t('contact.title') }}
              </span>
            </slot>
            <span v-if="$slots['header-extra']" class="address-book-container__header-extra">
              <slot name="header-extra" />
            </span>
          </div>

          <div v-if="props.showSearch" class="address-book-container__search">
            <Input
              v-model="homeSearchKeyword"
              variant="search"
              :placeholder="t('contact.searchPlaceholder')"
              prefix-icon="misc/magnifier2"
            />
          </div>

          <div class="address-book-container__nav-wrap">
            <slot name="nav" :entries="navEntries" :on-entry-click="onEntryClick">
              <ContactNav :entries="navEntries" @entry-click="onEntryClick">
                <template v-if="$slots['nav-entry']" #entry="entrySlotProps">
                  <slot name="nav-entry" v-bind="entrySlotProps" />
                </template>
                <template v-if="$slots['nav-entry-extra']" #entry-extra="entrySlotProps">
                  <slot name="nav-entry-extra" v-bind="entrySlotProps" />
                </template>
              </ContactNav>
            </slot>
            <div v-if="$slots['home-body']" class="address-book-container__home-body">
              <slot name="home-body" />
            </div>
          </div>

          <div v-if="$slots['home-footer']" class="address-book-container__home-footer">
            <slot name="home-footer" />
          </div>
        </template>

        <!-- ===================== 子视图通用头部 ===================== -->
        <template v-else>
          <div
            v-if="isDrilldown && props.showHeader"
            class="address-book-container__subheader"
          >
            <span class="address-book-container__back" @click="goHome">
              <slot name="back-icon">
                <Icon name="navigation/chevron_left" :size="20" />
              </slot>
            </span>
            <span class="address-book-container__subtitle">{{ subviewTitle }}</span>
            <span class="address-book-container__subheader-extra">
              <slot name="subheader-extra" :view="view" />
            </span>
          </div>

          <!-- 子视图内容：notice 视图优先使用 #notice 插槽，否则默认渲染 ContactNoticeList；其他视图使用默认插槽 -->
          <div class="address-book-container__subview">
            <template v-if="view === 'notice'">
              <slot name="notice" />
              <ContactNoticeList v-if="!$slots.notice" />
            </template>
            <slot v-else :view="view" />
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.address-book-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
  overflow: hidden;
}

.address-book-container__view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ===== 视图过场 ===== */
.address-book-container-slide-enter-active,
.address-book-container-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.address-book-container-slide-enter-from {
  transform: translateX(8%);
  opacity: 0;
}
.address-book-container-slide-leave-to {
  transform: translateX(-8%);
  opacity: 0;
}
.address-book-container-fade-enter-active,
.address-book-container-fade-leave-active {
  transition: opacity 0.18s ease;
}
.address-book-container-fade-enter-from,
.address-book-container-fade-leave-to {
  opacity: 0;
}
.address-book-container-none-enter-active,
.address-book-container-none-leave-active {
  transition: none;
}

.address-book-container__header {
  padding: calc(12px + var(--uikit-safe-top, 0px)) 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.address-book-container__header--center {
  justify-content: center;
}

.address-book-container__header--right {
  flex-direction: row-reverse;
}

.address-book-container__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.address-book-container__search {
  padding: 2px 0 8px;
}

.address-book-container__nav-wrap {
  flex: 1;
  overflow-y: auto;
}

.address-book-container__home-body {
  padding: 0 16px;
}

.address-book-container__home-footer {
  padding: 12px 16px calc(12px + var(--uikit-safe-bottom, 0px));
  flex-shrink: 0;
}

.address-book-container__header-extra {
  display: inline-flex;
  align-items: center;
}

.address-book-container__subheader {
  position: relative;
  padding: calc(12px + var(--uikit-safe-top, 0px)) 48px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.address-book-container__back {
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

.address-book-container__back:hover {
  background-color: var(--uikit-bg-secondary);
}

.address-book-container__subtitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.address-book-container__subheader-extra {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
}

.address-book-container__subview {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
