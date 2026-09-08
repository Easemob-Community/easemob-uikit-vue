<script setup lang="ts">
import { ref } from 'vue'

const mediumOn = ref(true)
const mediumOff = ref(false)
const smallOn = ref(true)
const smallOff = ref(false)
</script>

<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: center;
    "
  >
    <em-switch v-model="mediumOff" />
    <em-switch v-model="mediumOn" />
    <em-switch v-model="smallOff" size="small" />
    <em-switch v-model="smallOn" size="small" />
  </div>
</template>
