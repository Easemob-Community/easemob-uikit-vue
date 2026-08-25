<script setup lang="ts">
import { ref } from 'vue'
import BlockList from '../../modules/contact/block-list.vue'
import type { UiContact as Contact } from '@easemob/uikit-core'
import type { AvatarShape, ContactItemSize } from '../../modules/contact/types'

export interface BlockListContainerProps {
  // ---------- 外观 ----------
  /** 是否展示头部，默认 true */
  showHeader?: boolean
  /** Header 标题 */
  title?: string
  /** 是否在标题旁展示数量徽标 (n)，默认 false */
  showCount?: boolean
  /** 空列表提示文字 */
  emptyText?: string
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>

  // ---------- 列表配置 ----------
  /** 是否展示头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸 */
  avatarSize?: number
  /** 头像形状 */
  avatarShape?: AvatarShape
  /** Item 紧凑度 */
  itemSize?: ContactItemSize

  // ---------- 点击行为 ----------
  /**
   * 列表项点击行为模式，默认 'default'。
   * - 'default': 触发 click 事件
   * - 'event-only': 仅触发 click 事件，由外部完全接管
   */
  clickBehavior?: 'default' | 'event-only'

  // ---------- 自治拉取 ----------
  /**
   * mount 时自动拉取黑名单，默认 true。
   * 需 Provider.enableBlocklist=true 才会生效；已加载则跳过（幂等）。
   */
  autoFetch?: boolean
}

const props = withDefaults(defineProps<BlockListContainerProps>(), {
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

const blockListRef = ref<InstanceType<typeof BlockList>>()

defineExpose({
  blockListRef,
})
</script>

<template>
  <div class="block-list-container" :class="props.class" :style="props.style">
    <BlockList
      ref="blockListRef"
      :show-header="props.showHeader"
      :title="props.title"
      :show-count="props.showCount"
      :empty-text="props.emptyText"
      :show-avatar="props.showAvatar"
      :avatar-size="props.avatarSize"
      :avatar-shape="props.avatarShape"
      :item-size="props.itemSize"
      :click-behavior="props.clickBehavior"
      :auto-fetch="props.autoFetch"
      @click="(c: Contact) => emit('click', c)"
      @contextmenu="(e: MouseEvent, c: Contact) => emit('contextmenu', e, c)"
      @unblock="(c: Contact) => emit('unblock', c)"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>
    </BlockList>
  </div>
</template>

<style scoped>
.block-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
