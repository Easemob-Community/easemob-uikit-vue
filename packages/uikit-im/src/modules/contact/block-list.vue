<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { EmPopup as Popup, EmModal as Modal, EmEmpty as Empty, EmIcon as Icon, EmIconButton as IconButton, useLocale, useToast } from '@easemob/uikit-core'
import { useBlocklist } from '../../composables/use-blocklist'
import { useUIKit } from '../../composables/use-uikit'
import type { UiContact as Contact } from '@easemob/uikit-core'
import type { AvatarShape, ContactItemSize } from './types'
import ContactItem from './contact-item.vue'
import BlockListAddModal from './block-list-add-modal.vue'

export interface BlockListProps {
  /** 是否展示头部，默认 true */
  showHeader?: boolean
  /** Header 标题，不传使用 i18n 默认值 */
  title?: string
  /** 是否在标题旁展示数量徽标 (n)，默认 false */
  showCount?: boolean
  /** 空列表提示文字 */
  emptyText?: string
  /** 是否展示头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸（px），覆盖 itemSize 推断 */
  avatarSize?: number
  /** 头像形状，默认 circle */
  avatarShape?: AvatarShape
  /** Item 紧凑度，默认 'normal' */
  itemSize?: ContactItemSize
  /** 列表项点击行为模式，默认 'default' */
  clickBehavior?: 'default' | 'event-only'
  /** mount 时自动拉取黑名单，默认 true（需 Provider.enableBlocklist=true） */
  autoFetch?: boolean
}

const props = withDefaults(defineProps<BlockListProps>(), {
  showHeader: true,
  showCount: false,
  showAvatar: true,
  avatarShape: undefined,
  itemSize: 'normal',
  clickBehavior: 'default',
  autoFetch: true,
})

const emit = defineEmits<{
  (e: 'click', contact: Contact): void
  (e: 'contextmenu', event: MouseEvent, contact: Contact): void
  (e: 'unblock', contact: Contact): void
}>()

const { t } = useLocale()
const { features } = useUIKit()
const { blockList, refresh: refreshBlocklist, removeBlock } = useBlocklist()
const { show: showToast } = useToast()

const loading = ref(false)
/** 是否展示「添加黑名单」选人弹窗 */
const showAddModal = ref(false)

const resolvedCount = computed(() => blockList.value.length)

/** 右键菜单状态 */
const menuVisible = ref(false)
const menuContact = ref<Contact | null>(null)
const menuAnchor = ref<HTMLElement | undefined>()

function onItemContextmenu(e: MouseEvent, contact: Contact) {
  // 拦截浏览器默认右键菜单（对齐会话右键的处理，避免弹出系统菜单）
  e.preventDefault()
  e.stopPropagation()
  menuAnchor.value = e.currentTarget as HTMLElement
  menuContact.value = contact
  menuVisible.value = true
  emit('contextmenu', e, contact)
}

function onItemClick(contact: Contact) {
  emit('click', contact)
}

function closeMenu() {
  menuVisible.value = false
}

/** 确认移除弹窗 */
const confirmShow = ref(false)

function onMenuSelect() {
  const contact = menuContact.value
  closeMenu()
  if (!contact)
    return
  confirmShow.value = true
}

async function onConfirmRemove() {
  const contact = menuContact.value
  confirmShow.value = false
  if (!contact)
    return
  try {
    await removeBlock(contact.userId)
    showToast(t('contact.blocklist.removeSuccess', '已移出黑名单'), 'success')
    emit('unblock', contact)
  }
  catch {
    showToast(t('contact.blocklist.removeFailed', '移出失败'), 'error')
  }
}

async function maybeFetch() {
  if (!props.autoFetch)
    return
  // 未开启黑名单 feature 或无 client 时不拉取
  if (!features.enableBlocklist)
    return
  if (blockList.value.length > 0)
    return
  loading.value = true
  try {
    await refreshBlocklist()
  }
  catch {
    // refresh 内部已做 warn 日志，这里仅复位 loading
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void maybeFetch()
})

defineExpose({
  refresh: maybeFetch,
})
</script>

<template>
  <div class="block-list-contact">
    <div
      v-if="props.showHeader"
      class="block-list-contact__header"
    >
      <slot name="header">
        <span class="block-list-contact__title">
          {{ props.title || t('contact.entryBlocklist', '黑名单') }}
          <span v-if="props.showCount" class="block-list-contact__count">({{ resolvedCount }})</span>
        </span>
      </slot>
      <slot name="header-extra">
        <IconButton
          icon="circle/plus"
          size="small"
          variant="ghost"
          :icon-size="22"
          :title="t('contact.blocklist.add', '添加黑名单')"
          @click="showAddModal = true"
        />
      </slot>
    </div>

    <div class="block-list-contact__body">
      <div v-if="loading && blockList.length === 0" class="block-list-contact__status">
        {{ t('common.loading') }}
      </div>
      <Empty
        v-else-if="blockList.length === 0"
        icon="circle/slash"
        :description="props.emptyText || t('contact.blocklist.empty', '暂无黑名单')"
        size="small"
      />
      <template v-else>
        <div class="block-list-contact__scroll">
          <ContactItem
            v-for="contact in blockList"
            :key="contact.userId"
            :contact="contact"
            :show-avatar="props.showAvatar"
            :avatar-size="props.avatarSize"
            :avatar-shape="props.avatarShape"
            :size="props.itemSize"
            @click="onItemClick"
            @contextmenu="onItemContextmenu"
          />
        </div>
      </template>
    </div>

    <!-- 右键菜单：移出黑名单 -->
    <Popup
      :show="menuVisible"
      :anchor="menuAnchor"
      placement="bottom"
      :overlay="false"
      :close-on-click-overlay="true"
      group="block-list-context-menu"
      @update:show="closeMenu"
      @close="closeMenu"
    >
      <div class="block-list-contact__menu" @click.stop>
        <div
          class="block-list-contact__menu-item block-list-contact__menu-item--danger"
          @click="onMenuSelect"
        >
          <Icon name="person/minus" :size="16" />
          <span>{{ t('contact.blocklist.remove', '移出黑名单') }}</span>
        </div>
      </div>
    </Popup>

    <Modal
      v-model:show="confirmShow"
      :title="t('contact.blocklist.removeConfirmTitle', '移出黑名单')"
      :width="719"
      type="warning"
      :confirm-text="t('button.confirm', '确认')"
      :cancel-text="t('button.cancel', '取消')"
      @confirm="onConfirmRemove"
      @cancel="confirmShow = false"
    >
      {{ t('contact.blocklist.removeConfirm', '确定将其移出黑名单吗？') }}
    </Modal>

    <!-- 添加黑名单：选人弹窗 -->
    <BlockListAddModal v-model:show="showAddModal" />

    <!-- 水印覆盖层（#watermark：用户注入水印内容，铺满整个列表区，不响应交互） -->
    <div v-if="$slots.watermark" class="block-list-contact__watermark">
      <slot name="watermark" />
    </div>
  </div>
</template>

<style scoped>
.block-list-contact {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--uikit-bg-base);
  overflow: hidden;
  position: relative;
}

/* 水印覆盖层：铺满列表区，穿透事件；层级与内容浮层一致，低于弹窗 */
.block-list-contact__watermark {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
}

.block-list-contact__header {
  box-sizing: border-box;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
}

.block-list-contact__title {
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-semibold);
  color: var(--uikit-text-primary);
}

.block-list-contact__count {
  margin-left: 6px;
  font-size: var(--uikit-font-size-11);
  font-weight: var(--uikit-font-weight-regular);
  color: var(--uikit-text-secondary);
}

.block-list-contact__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.block-list-contact__status {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.block-list-contact__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 与好友列表容器对齐：不再额外内缩，避免 hover 背景/内容距离面板边缘过宽（双内缩） */
  padding: 4px 0 8px;
}

.block-list-contact__menu {
  min-width: 140px;
  padding: 4px;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.block-list-contact__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-primary);
  border-radius: 6px;
  cursor: pointer;
}

.block-list-contact__menu-item--danger {
  color: var(--uikit-danger-color);
}

@media (hover: hover) {
  .block-list-contact__menu-item:hover {
    background-color: var(--uikit-bg-secondary);
  }
}
</style>
