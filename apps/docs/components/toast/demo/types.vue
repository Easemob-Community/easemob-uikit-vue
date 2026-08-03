<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const message = ref('')
const toastType = ref<'info' | 'success' | 'error' | 'warning'>('info')

function showToast(type: 'info' | 'success' | 'error' | 'warning', msg: string) {
  toastType.value = type
  message.value = msg
  show.value = true
  setTimeout(() => {
    show.value = false
  }, 2000)
}
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
    <em-button @click="showToast('info', '这是一条提示')">
      Info
    </em-button>
    <em-button type="success" @click="showToast('success', '操作成功')">
      Success
    </em-button>
    <em-button type="danger" @click="showToast('error', '操作失败')">
      Error
    </em-button>
    <em-button type="warning" @click="showToast('warning', '请注意')">
      Warning
    </em-button>
    <em-toast :show="show" :message="message" :type="toastType" />
  </div>
</template>
