<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
</script>

<template>
  <div
    style="
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
    "
  >
    <em-button @click="show = true">
      自定义文案
    </em-button>
    <em-modal
      v-model:show="show"
      title="退出登录"
      cancel-text="再想想"
      confirm-text="确认退出"
    >
      确定要退出当前账号吗？
    </em-modal>
  </div>
</template>
