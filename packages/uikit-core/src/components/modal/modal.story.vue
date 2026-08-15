<script setup lang="ts">
import { ref } from 'vue'
import Modal from './modal.vue'
import Button from '../button/button.vue'

const show1 = ref(false)
const show2 = ref(false)
const show3 = ref(false)
</script>

<template>
  <Story title="Modal">
    <Variant title="Basic">
      <Button @click="show1 = true">打开 Modal</Button>
      <Modal v-model:show="show1" title="确认删除？">
        删除后数据将无法恢复，是否继续？
      </Modal>
    </Variant>
    <Variant title="No Cancel">
      <Button type="primary" @click="show2 = true">无取消按钮</Button>
      <Modal v-model:show="show2" title="提示" :show-cancel="false">
        操作成功完成
      </Modal>
    </Variant>
    <Variant title="Custom Text">
      <Button @click="show3 = true">自定义文案</Button>
      <Modal
        v-model:show="show3"
        title="退出登录"
        cancel-text="再想想"
        confirm-text="确认退出"
      >
        确定要退出当前账号吗？
      </Modal>
    </Variant>
  </Story>
</template>
