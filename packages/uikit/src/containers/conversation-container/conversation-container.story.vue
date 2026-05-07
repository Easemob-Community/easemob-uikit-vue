<script setup lang="ts">
import ConversationContainer from './conversation-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
</script>

<template>
  <Story title="ConversationContainer">
    <Variant title="Default">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
