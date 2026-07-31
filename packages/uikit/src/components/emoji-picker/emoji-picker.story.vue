<script setup lang="ts">
import { ref } from 'vue'
import Button from '../button/button.vue'
import EmojiPicker from './emoji-picker.vue'

const show = ref(true)
const selected = ref('')

function onSelect(emoji: string) {
  selected.value = emoji
}
</script>

<template>
  <Story title="EmojiPicker">
    <Variant title="基础用法">
      <div style="width: 340px;">
        <div class="u-flex u-gap-2 u-items-center" style="margin-bottom: 8px;">
          <Button size="small" @click="show = !show">
            {{ show ? '关闭' : '打开' }}表情
          </Button>
          <span v-if="selected" style="font-size: 13px; color: var(--uikit-text-secondary);">
            已选择：{{ selected }}
          </span>
        </div>
        <EmojiPicker v-model:show="show" @select="onSelect" />
      </div>
    </Variant>
  </Story>
</template>
