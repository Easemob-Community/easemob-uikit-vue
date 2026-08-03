<script setup lang="ts">
import { computed } from 'vue'
import { useChatPlugin, useLocale } from '@easemob/uikit'

export interface DemoQuickReplyPanelEmits {
  (e: 'select', text: string): void
}

const emit = defineEmits<DemoQuickReplyPanelEmits>()

const { t } = useLocale()
const { currentConversation } = useChatPlugin()

interface QuickReplyItem {
  key: string
  label: string
  text: string
}

interface QuickReplyGroup {
  title: string
  items: QuickReplyItem[]
}

const groups = computed<QuickReplyGroup[]>(() => [
  {
    title: t('demo.quickReply.group.greet'),
    items: [
      { key: 'greet-1', label: t('demo.quickReply.item.welcome'), text: '您好，请问有什么可以帮您？' },
      { key: 'greet-2', label: t('demo.quickReply.item.wait'), text: '请稍等，我帮您查询一下。' },
    ],
  },
  {
    title: t('demo.quickReply.group.follow'),
    items: [
      { key: 'follow-1', label: t('demo.quickReply.item.shipped'), text: '您的订单已发货，请注意查收。' },
      { key: 'follow-2', label: t('demo.quickReply.item.processing'), text: '您的问题正在处理中，请耐心等待。' },
    ],
  },
  {
    title: t('demo.quickReply.group.end'),
    items: [
      { key: 'end-1', label: t('demo.quickReply.item.thanks'), text: '感谢您的咨询，祝您生活愉快！' },
      { key: 'end-2', label: t('demo.quickReply.item.goodbye'), text: '如有其他问题随时联系，再见！' },
    ],
  },
])

function onSelect(item: QuickReplyItem) {
  emit('select', item.text)
}
</script>

<template>
  <div class="demo-quick-reply">
    <div v-if="!currentConversation" class="demo-quick-reply__empty">
      {{ t('demo.quickReply.empty') }}
    </div>
    <template v-else>
      <div
        v-for="group in groups"
        :key="group.title"
        class="demo-quick-reply__group"
      >
        <div class="demo-quick-reply__group-title">{{ group.title }}</div>
        <div class="demo-quick-reply__items">
          <button
            v-for="item in group.items"
            :key="item.key"
            class="demo-quick-reply__item"
            @click="onSelect(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.demo-quick-reply {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.demo-quick-reply__empty {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

.demo-quick-reply__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-quick-reply__group-title {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.demo-quick-reply__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-quick-reply__item {
  padding: 6px 12px;
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius, 6px);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.demo-quick-reply__item:hover {
  border-color: var(--uikit-primary-color);
  color: var(--uikit-primary-color);
}
</style>
