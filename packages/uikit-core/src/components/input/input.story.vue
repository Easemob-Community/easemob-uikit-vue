<script setup lang="ts">
import { ref } from 'vue'
import Input from './input.vue'

const textValue = ref('')
const passwordValue = ref('')
const disabledValue = ref('不可编辑')
const searchValue = ref('')
const filledValue = ref('')
const ghostValue = ref('')
const underlineValue = ref('')
</script>

<template>
  <Story title="Input">
    <Variant title="Default">
      <Input v-model="textValue" placeholder="请输入内容" />
    </Variant>
    <Variant title="Search">
      <Input v-model="searchValue" variant="search" prefix-icon="search" placeholder="搜索..." />
    </Variant>
    <Variant title="Filled">
      <Input v-model="filledValue" variant="filled" prefix-icon="search" placeholder="搜索..." />
    </Variant>
    <Variant title="Ghost">
      <Input v-model="ghostValue" variant="ghost" prefix-icon="search" placeholder="搜索..." />
    </Variant>
    <Variant title="Underline">
      <Input v-model="underlineValue" variant="underline" prefix-icon="search" placeholder="搜索..." />
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
