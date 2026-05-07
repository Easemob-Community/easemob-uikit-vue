<script setup lang="ts">
import { ref } from 'vue'
import Input from './input.vue'

const textValue = ref('')
const passwordValue = ref('')
const disabledValue = ref('不可编辑')
</script>

<template>
  <Story title="Input">
    <Variant title="Basic">
      <Input v-model="textValue" placeholder="请输入内容" />
    </Variant>
    <Variant title="Password">
      <Input v-model="passwordValue" type="password" placeholder="请输入密码" />
    </Variant>
    <Variant title="Disabled">
      <Input v-model="disabledValue" disabled />
    </Variant>
    <Variant title="Maxlength">
      <Input v-model="textValue" :maxlength="10" placeholder="最多10个字符" />
    </Variant>
  </Story>
</template>
