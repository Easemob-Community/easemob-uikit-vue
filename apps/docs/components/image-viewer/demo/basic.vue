<script setup lang="ts">
import { ref } from 'vue'

const showSingle = ref(false)
const showAlbum = ref(false)
const albumIndex = ref(0)
const singleSrcs = ['https://picsum.photos/id/1015/900/700']
const albumSrcs = [
  'https://picsum.photos/id/1015/900/700',
  'https://picsum.photos/id/1016/900/700',
  'https://picsum.photos/id/1018/900/700',
]
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
    <em-button @click="showSingle = true">
      预览单图
    </em-button>
    <em-button type="primary" @click="showAlbum = true">
      预览多图相册
    </em-button>
  </div>
  <em-image-viewer v-model:show="showSingle" :srcs="singleSrcs" />
  <em-image-viewer v-model:show="showAlbum" v-model:index="albumIndex" :srcs="albumSrcs" />
</template>
