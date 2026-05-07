<script setup lang="ts">
import ConversationContainer from './conversation-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'

const customActions = [
  {
    key: 'mute',
    label: '静音',
    icon: 'volume-off',
    handler: (cvs: any) => {
      // eslint-disable-next-line no-console
      console.log('mute conversation', cvs.id)
    },
  },
]
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

    <Variant title="Hide Search">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :show-search="false" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Actions">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :custom-actions="customActions" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Header">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer>
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-weight: 600;">自定义标题</span>
                <span style="font-size: 12px; color: #6b7280;">v1.0</span>
              </div>
            </template>
          </ConversationContainer>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
