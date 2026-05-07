<script setup lang="ts">
import { UIKitProvider } from '@easemob/uikit'
import DemoPage from './demo-page.vue'
</script>

<template>
  <UIKitProvider :auto-init="false">
    <DemoPage />
  </UIKitProvider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
