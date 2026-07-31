<script setup lang="ts">
import { ref } from 'vue'
import MessageVirtualList from './message-virtual-list.vue'

interface Row {
  id: string
  label: string
}

const rows = ref<Row[]>(
  Array.from({ length: 200 }, (_, i) => ({
    id: `row_${i}`,
    label: `第 ${i + 1} 行：虚拟列表演示数据`,
  })),
)
</script>

<template>
  <Story title="Modules/MessageVirtualList">
    <Variant title="200 行数据（estimate 60px）">
      <div style="padding: 24px; height: 420px;">
        <MessageVirtualList :items="rows" key-field="id" :estimate-height="60" />
      </div>
    </Variant>

    <Variant title="小缓冲区（buffer 2）">
      <div style="padding: 24px; height: 420px;">
        <MessageVirtualList :items="rows" key-field="id" :estimate-height="60" :buffer="2" />
      </div>
    </Variant>
  </Story>
</template>
