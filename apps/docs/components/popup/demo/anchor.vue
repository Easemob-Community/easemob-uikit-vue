<script setup lang="ts">
import { ref } from 'vue'

const anchorRef = ref<HTMLElement>()
const showBottom = ref(false)
const showTop = ref(false)
const showLeft = ref(false)
const showRight = ref(false)
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      padding: 24px 0;
    "
  >
    <div
      style="
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: center;
      "
    >
      <em-button ref="anchorRef" @click="showBottom = true">
        锚点下方
      </em-button>
      <em-button @click="showTop = true">
        锚点上方
      </em-button>
      <em-button @click="showLeft = true">
        锚点左侧
      </em-button>
      <em-button @click="showRight = true">
        锚点右侧
      </em-button>
    </div>
    <div style="font-size: 12px; color: #6b7280;">
      锚点定位不显示遮罩，适合工具栏 / 下拉菜单等场景
    </div>

    <em-popup v-model:show="showBottom" :anchor="anchorRef" placement="bottom" :overlay="false">
      <div style="padding: 16px; min-width: 160px;">
        锚点下方内容
      </div>
    </em-popup>
    <em-popup v-model:show="showTop" :anchor="anchorRef" placement="top" :overlay="false">
      <div style="padding: 16px; min-width: 160px;">
        锚点上方内容
      </div>
    </em-popup>
    <em-popup v-model:show="showLeft" :anchor="anchorRef" placement="left" :overlay="false">
      <div style="padding: 16px; min-width: 160px;">
        锚点左侧内容
      </div>
    </em-popup>
    <em-popup v-model:show="showRight" :anchor="anchorRef" placement="right" :overlay="false">
      <div style="padding: 16px; min-width: 160px;">
        锚点右侧内容
      </div>
    </em-popup>
  </div>
</template>
