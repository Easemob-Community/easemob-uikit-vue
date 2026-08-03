<script setup lang="ts">
import { ref } from 'vue'

const textValue = ref('')
const searchValue = ref('')
const filledValue = ref('')
const ghostValue = ref('')
const underlineValue = ref('')
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
    "
  >
    <em-input v-model="textValue" placeholder="请输入内容" />
    <em-input v-model="searchValue" variant="search" prefix-icon="misc/magnifier2" placeholder="搜索..." />
    <em-input v-model="filledValue" variant="filled" prefix-icon="misc/magnifier2" placeholder="搜索..." />
    <em-input v-model="ghostValue" variant="ghost" prefix-icon="misc/magnifier2" placeholder="搜索..." />
    <em-input v-model="underlineValue" variant="underline" prefix-icon="misc/magnifier2" placeholder="搜索..." />
  </div>
</template>
