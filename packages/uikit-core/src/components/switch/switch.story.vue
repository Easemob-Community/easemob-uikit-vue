<script setup lang="ts">
import { ref } from 'vue'
import Switch from './switch.vue'

const on = ref(true)
const off = ref(false)
const onSmall = ref(true)
const offSmall = ref(false)
const lastChange = ref('')
</script>

<template>
  <Story title="Switch">
    <Variant title="Medium">
      <div class="u-flex u-gap-4 u-items-center">
        <Switch v-model="off" />
        <Switch v-model="on" />
      </div>
    </Variant>
    <Variant title="Small">
      <div class="u-flex u-gap-4 u-items-center">
        <Switch v-model="offSmall" size="small" />
        <Switch v-model="onSmall" size="small" />
      </div>
    </Variant>
    <Variant title="Disabled">
      <div class="u-flex u-gap-4 u-items-center">
        <Switch :model-value="false" disabled />
        <Switch :model-value="true" disabled />
        <Switch :model-value="false" size="small" disabled />
        <Switch :model-value="true" size="small" disabled />
      </div>
    </Variant>
    <Variant title="Loading">
      <div class="u-flex u-gap-4 u-items-center">
        <Switch :model-value="false" loading />
        <Switch :model-value="true" loading />
        <Switch :model-value="false" size="small" loading />
        <Switch :model-value="true" size="small" loading />
      </div>
    </Variant>
    <Variant title="Change Event">
      <div class="u-flex u-gap-4 u-items-center">
        <Switch @change="lastChange = `change: ${$event}`" />
        <span>{{ lastChange || '点击开关触发 change 事件' }}</span>
      </div>
    </Variant>
  </Story>
</template>
