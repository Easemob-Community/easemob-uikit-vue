<script setup lang="ts">
import { ref } from 'vue'

const passwordValue = ref('')
const disabledValue = ref('不可编辑')
const maxValue = ref('')
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
    <em-input v-model="passwordValue" type="password" placeholder="请输入密码" />
    <em-input v-model="disabledValue" disabled />
    <em-input v-model="maxValue" :maxlength="10" placeholder="最多 10 个字符" />
  </div>
</template>
