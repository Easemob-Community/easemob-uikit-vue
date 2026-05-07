<script setup lang="ts">
import { UIKitProvider, ConversationContainer, ChatContainer } from '@easemob/uikit'
</script>

<template>
  <UIKitProvider app-key="your-app-key">
    <div class="demo-layout">
      <div class="demo-layout__sidebar">
        <ConversationContainer />
      </div>
      <div class="demo-layout__main">
        <ChatContainer />
      </div>
    </div>
  </UIKitProvider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

.demo-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.demo-layout__sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
}

.demo-layout__main {
  flex: 1;
  min-width: 0;
}
</style>
