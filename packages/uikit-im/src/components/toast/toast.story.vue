<script setup lang="ts">
import { ref } from 'vue'
import Toast from './toast.vue'
import Button from '../button/button.vue'

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
  <Story title="Toast">
    <Variant title="Types">
      <div class="u-flex u-gap-2">
        <Button @click="showToast('info', '这是一条提示')">Info</Button>
        <Button type="success" @click="showToast('success', '操作成功')">Success</Button>
        <Button type="danger" @click="showToast('error', '操作失败')">Error</Button>
        <Button type="warning" @click="showToast('warning', '请注意')">Warning</Button>
      </div>
      <Toast :show="show" :message="message" :type="toastType" />
    </Variant>
  </Story>
</template>
