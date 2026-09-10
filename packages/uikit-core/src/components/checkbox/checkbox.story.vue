<script setup lang="ts">
import { ref } from 'vue'
import Checkbox from './checkbox.vue'

const checked = ref(true)
</script>

<template>
  <Story title="Checkbox">
    <Variant title="States">
      <div class="u-flex u-gap-4 u-items-center">
        <Checkbox :checked="false" />
        <Checkbox :checked="true" />
        <Checkbox :checked="false" disabled />
        <Checkbox :checked="true" disabled />
      </div>
    </Variant>
    <Variant title="Sizes">
      <div class="u-flex u-gap-4 u-items-center">
        <Checkbox checked :size="16" />
        <Checkbox checked :size="18" />
        <Checkbox checked :size="20" />
        <Checkbox checked :size="22" />
        <Checkbox checked :size="24" />
      </div>
    </Variant>
    <Variant title="Clickable (parent toggles)">
      <div class="u-flex u-gap-2 u-items-center" style="cursor: pointer" @click="checked = !checked">
        <Checkbox :checked="checked" />
        <span>点击切换：{{ checked ? '已选中' : '未选中' }}</span>
      </div>
    </Variant>
  </Story>
</template>
