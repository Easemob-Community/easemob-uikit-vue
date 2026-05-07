<script setup lang="ts">
import ChatContainer from './chat-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
</script>

<template>
  <Story title="ChatContainer">
    <Variant title="Default">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ChatContainer />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
