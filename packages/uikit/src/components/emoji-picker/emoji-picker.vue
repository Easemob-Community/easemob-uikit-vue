<script setup lang="ts">
import { ref, computed } from 'vue'

export interface EmojiPickerProps {
  show: boolean
}

const props = defineProps<EmojiPickerProps>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'select', emoji: string): void
}>()

/** 常用 Emoji 列表 */
const emojiGroups = [
  {
    name: '常用',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
]

const activeGroup = ref(0)
const activeEmojis = computed(() => emojiGroups[activeGroup.value]?.emojis ?? [])

function onSelect(emoji: string) {
  emit('select', emoji)
}

function onClose() {
  emit('update:show', false)
}
</script>

<template>
  <div v-if="props.show" class="emoji-picker">
    <div class="emoji-picker__header">
      <div class="emoji-picker__tabs">
        <div
          v-for="(group, index) in emojiGroups"
          :key="index"
          class="emoji-picker__tab"
          :class="{ 'emoji-picker__tab--active': activeGroup === index }"
          @click="activeGroup = index"
        >
          {{ group.name }}
        </div>
      </div>
      <button class="emoji-picker__close" @click="onClose">&times;</button>
    </div>
    <div class="emoji-picker__body">
      <button
        v-for="emoji in activeEmojis"
        :key="emoji"
        class="emoji-picker__item"
        @click="onSelect(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker {
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
  width: 320px;
}

.emoji-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.emoji-picker__tabs {
  display: flex;
  gap: 12px;
}

.emoji-picker__tab {
  font-size: 13px;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.emoji-picker__tab:hover {
  color: var(--uikit-text-primary);
}

.emoji-picker__tab--active {
  color: var(--uikit-primary-color);
  background-color: var(--uikit-bg-secondary);
  font-weight: 500;
}

.emoji-picker__close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.emoji-picker__body {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-picker__item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.emoji-picker__item:hover {
  background-color: var(--uikit-bg-secondary);
}
</style>
