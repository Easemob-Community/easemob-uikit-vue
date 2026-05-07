<script setup lang="ts">
import Chat from '../modules/chat/chat.vue'
</script>

<template>
  <div class="chat-container">
    <Chat />
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}
</style>
