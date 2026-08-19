<script setup lang="ts">
import { ref } from 'vue'
import Toast from './toast.vue'
import Button from '../button/button.vue'

const show = ref(false)
const message = ref('')
const toastType = ref<'info' | 'success' | 'error' | 'warning'>('info')
const toastPosition = ref<'top' | 'center' | 'bottom'>('center')
const toastClosable = ref(false)
const toastActionText = ref('')
const toastDuration = ref(2000)

function showToast(
  type: 'info' | 'success' | 'error' | 'warning',
  msg: string,
  options: { position?: 'top' | 'center' | 'bottom', closable?: boolean, actionText?: string, duration?: number } = {},
) {
  toastType.value = type
  message.value = msg
  toastPosition.value = options.position ?? 'center'
  toastClosable.value = options.closable ?? false
  toastActionText.value = options.actionText ?? ''
  toastDuration.value = options.duration ?? 2000
  show.value = true
}

function onAction() {
  message.value = '已点击操作按钮'
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
      <Toast
        :show="show"
        :message="message"
        :type="toastType"
        :position="toastPosition"
        :closable="toastClosable"
        :action-text="toastActionText"
        :duration="toastDuration"
        @action="onAction"
      />
    </Variant>
    <Variant title="Closable">
      <Button @click="showToast('info', '点击右侧按钮关闭', { closable: true, duration: 0 })">
        打开可关闭 Toast
      </Button>
    </Variant>
    <Variant title="Position">
      <div class="u-flex u-gap-2">
        <Button @click="showToast('info', '顶部提示', { position: 'top' })">Top</Button>
        <Button @click="showToast('info', '居中提示', { position: 'center' })">Center</Button>
        <Button @click="showToast('info', '底部提示', { position: 'bottom' })">Bottom</Button>
      </div>
    </Variant>
    <Variant title="Action">
      <Button @click="showToast('error', '发送失败', { actionText: '重试', duration: 0 })">
        带操作按钮
      </Button>
    </Variant>
  </Story>
</template>
