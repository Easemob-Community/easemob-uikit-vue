<script setup lang="ts">
import { computed, ref } from 'vue'
import Popup from '../../../components/popup/popup.vue'
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'

export interface GroupReadReceiptModalProps {
  show: boolean
  readList: string[]
  unreadList: string[]
}

const props = defineProps<GroupReadReceiptModalProps>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { t } = useLocale()

/** 当前激活的 Tab：'read' | 'unread' */
const activeTab = ref<'read' | 'unread'>('read')

const readCount = computed(() => props.readList.length)
const unreadCount = computed(() => props.unreadList.length)

const displayList = computed(() => {
  return activeTab.value === 'read' ? props.readList : props.unreadList
})

function onClose() {
  emit('update:show', false)
}
</script>

<template>
  <Popup
    :show="props.show"
    position="center"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onClose"
  >
    <div class="group-read-modal">
      <!-- 标题 -->
      <div class="group-read-modal__header">
        <span class="group-read-modal__title">{{ t('groupReadReceipt.title') }}</span>
        <button class="group-read-modal__close" @click="onClose">&times;</button>
      </div>

      <!-- Tab 切换 -->
      <div class="group-read-modal__tabs">
        <div
          class="group-read-modal__tab"
          :class="{ 'group-read-modal__tab--active': activeTab === 'read' }"
          @click="activeTab = 'read'"
        >
          <span class="group-read-modal__tab-count">{{ readCount }}</span>
          <span class="group-read-modal__tab-label">{{ t('groupReadReceipt.read') }}</span>
        </div>
        <div
          class="group-read-modal__tab"
          :class="{ 'group-read-modal__tab--active': activeTab === 'unread' }"
          @click="activeTab = 'unread'"
        >
          <span class="group-read-modal__tab-count">{{ unreadCount }}</span>
          <span class="group-read-modal__tab-label">{{ t('groupReadReceipt.unread') }}</span>
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="group-read-modal__list">
        <div
          v-for="userId in displayList"
          :key="userId"
          class="group-read-modal__item"
        >
          <Avatar :name="userId" :size="36" />
          <span class="group-read-modal__name">{{ userId }}</span>
        </div>
        <div v-if="displayList.length === 0" class="group-read-modal__empty">
          {{ t('groupReadReceipt.empty') }}
        </div>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.group-read-modal {
  width: 320px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: 12px;
  overflow: hidden;
}

.group-read-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  flex-shrink: 0;
}

.group-read-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.group-read-modal__close {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.group-read-modal__close:hover {
  background-color: var(--uikit-bg-secondary);
}

/* Tab */
.group-read-modal__tabs {
  display: flex;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.group-read-modal__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 0;
  cursor: pointer;
  font-size: 14px;
  color: var(--uikit-text-secondary);
  transition: color 0.15s;
  position: relative;
}

.group-read-modal__tab:hover {
  color: var(--uikit-text-primary);
}

.group-read-modal__tab--active {
  color: var(--uikit-primary-color);
  font-weight: 500;
}

.group-read-modal__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background-color: var(--uikit-primary-color);
  border-radius: 1px;
}

.group-read-modal__tab-count {
  font-weight: 600;
}

.group-read-modal__tab-label {
  font-size: 13px;
}

/* 列表 */
.group-read-modal__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 120px;
}

.group-read-modal__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: default;
  transition: background-color 0.1s;
}

.group-read-modal__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.group-read-modal__name {
  font-size: 14px;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-read-modal__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  font-size: 13px;
  color: var(--uikit-text-secondary);
}
</style>
