<script setup lang="ts">
import { ref } from 'vue'

const groupAnchorA = ref<HTMLElement>()
const groupAnchorB = ref<HTMLElement>()
const groupAnchorC = ref<HTMLElement>()
const showGroupA = ref(false)
const showGroupB = ref(false)
const showGroupC = ref(false)
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    "
  >
    <div style="padding: 16px; color: #666; font-size: 13px; text-align: center;">
      同一 group 的 popup 同时只能开一个，打开新的会自动关闭其他。
      依次点击 A → B → C，观察前一个是否自动关闭。
    </div>
    <div
      style="
        display: flex;
        gap: 16px;
        padding: 24px;
        justify-content: center;
      "
    >
      <em-button ref="groupAnchorA" @click="showGroupA = true">
        打开 A
      </em-button>
      <em-button ref="groupAnchorB" @click="showGroupB = true">
        打开 B
      </em-button>
      <em-button ref="groupAnchorC" @click="showGroupC = true">
        打开 C
      </em-button>
    </div>
    <em-popup
      v-model:show="showGroupA"
      :anchor="groupAnchorA"
      placement="bottom"
      :overlay="false"
      group="docs-demo"
    >
      <div style="padding: 16px; min-width: 120px;">
        弹窗 A
      </div>
    </em-popup>
    <em-popup
      v-model:show="showGroupB"
      :anchor="groupAnchorB"
      placement="bottom"
      :overlay="false"
      group="docs-demo"
    >
      <div style="padding: 16px; min-width: 120px;">
        弹窗 B
      </div>
    </em-popup>
    <em-popup
      v-model:show="showGroupC"
      :anchor="groupAnchorC"
      placement="bottom"
      :overlay="false"
      group="docs-demo"
    >
      <div style="padding: 16px; min-width: 120px;">
        弹窗 C
      </div>
    </em-popup>
  </div>
</template>
