<script setup lang="ts">
import ConversationList from '../../modules/conversation/conversation-list.vue'
</script>

<template>
  <div class="conversation-container">
    <ConversationList />
  </div>
</template>

<style scoped>
.conversation-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}
</style>
