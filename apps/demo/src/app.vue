<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
import DemoPage from './demo-page.vue'
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <DemoPage />
  </EmUIKitProvider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
