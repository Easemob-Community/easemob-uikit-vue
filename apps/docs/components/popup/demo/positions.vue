<script setup lang="ts">
import { ref } from 'vue'

const showCenter = ref(false)
const showBottom = ref(false)
const showTop = ref(false)
const showLeft = ref(false)
const showRight = ref(false)
</script>

<template>
  <div
    style="
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    "
  >
    <em-button @click="showCenter = true">
      居中弹出
    </em-button>
    <em-button @click="showBottom = true">
      底部弹出
    </em-button>
    <em-button @click="showTop = true">
      顶部弹出
    </em-button>
    <em-button @click="showLeft = true">
      左侧弹出
    </em-button>
    <em-button @click="showRight = true">
      右侧弹出
    </em-button>

    <em-popup v-model:show="showCenter">
      <div style="padding: 40px; text-align: center;">
        居中内容
      </div>
    </em-popup>
    <em-popup v-model:show="showBottom" position="bottom">
      <div style="padding: 40px; text-align: center;">
        底部内容
      </div>
    </em-popup>
    <em-popup v-model:show="showTop" position="top">
      <div style="padding: 40px; text-align: center;">
        顶部内容
      </div>
    </em-popup>
    <em-popup v-model:show="showLeft" position="left">
      <div style="padding: 40px; text-align: center;">
        左侧内容
      </div>
    </em-popup>
    <em-popup v-model:show="showRight" position="right">
      <div style="padding: 40px; text-align: center;">
        右侧内容
      </div>
    </em-popup>
  </div>
</template>
