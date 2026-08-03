<script setup lang="ts">
import { ref } from 'vue'

const show1 = ref(false)
const show2 = ref(false)
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
    <em-button @click="show1 = true">
      打开 Modal
    </em-button>
    <em-button type="primary" @click="show2 = true">
      无取消按钮
    </em-button>
    <em-modal v-model:show="show1" title="确认删除？">
      删除后数据将无法恢复，是否继续？
    </em-modal>
    <em-modal v-model:show="show2" title="提示" :show-cancel="false">
      操作成功完成
    </em-modal>
  </div>
</template>
