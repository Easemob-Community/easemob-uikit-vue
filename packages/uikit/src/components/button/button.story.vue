<script setup lang="ts">
import { ref } from 'vue'
import Button from './button.vue'

const logs = ref<string[]>([])
const submitting = ref(false)

function logClick(event: MouseEvent) {
  logs.value.unshift(`click at (${event.clientX}, ${event.clientY})`)
}

function simulateSubmit() {
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    logs.value.unshift('提交完成（loading 结束）')
  }, 1500)
}
</script>

<template>
  <Story title="Button">
    <Variant title="语义类型 Types">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <Button type="primary">
          Primary
        </Button>
        <Button type="success">
          Success
        </Button>
        <Button type="warning">
          Warning
        </Button>
        <Button type="danger">
          Danger
        </Button>
        <Button type="danger-outline">
          Danger Outline
        </Button>
        <Button type="default">
          Default
        </Button>
      </div>
    </Variant>
    <Variant title="尺寸 Sizes">
      <div class="u-flex u-gap-2 u-items-center">
        <Button size="small">
          Small
        </Button>
        <Button size="medium">
          Medium
        </Button>
        <Button size="large">
          Large
        </Button>
      </div>
    </Variant>
    <Variant title="状态 States">
      <div class="u-flex u-gap-2">
        <Button disabled>
          Disabled
        </Button>
        <Button loading>
          Loading
        </Button>
      </div>
      <div class="u-mt-2">
        <Button block>
          Block
        </Button>
      </div>
    </Variant>
    <Variant title="插槽与图标 Slot">
      <div class="u-flex u-gap-2 u-items-center">
        <Button type="primary">
          发消息
        </Button>
        <Button type="default">
          取消
        </Button>
      </div>
    </Variant>
    <Variant title="点击事件 Click">
      <div class="u-flex u-gap-2">
        <Button @click="logClick">
          点击我
        </Button>
        <Button type="primary" :loading="submitting" @click="simulateSubmit">
          {{ submitting ? '提交中...' : '模拟提交' }}
        </Button>
      </div>
      <div class="u-mt-2" style="font-size: 12px; color: #6b7280;">
        事件：
        <ul style="margin: 4px 0; padding-left: 16px;">
          <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
            {{ logItem }}
          </li>
        </ul>
      </div>
    </Variant>
  </Story>
</template>
