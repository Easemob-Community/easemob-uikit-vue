<script setup lang="ts">
import { provide, onMounted, onUnmounted } from 'vue'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'
import { useMessageStore } from '../store/message'
import { useThemeStore } from '../store/theme'
import { useLocale } from '../locale'
import { createClient } from '../sdk/client'
import { createEventHandler } from '../sdk/event-handler'
import { UIKIT_CONTEXT_KEY } from '../composables/use-uikit'
import type { ClientConfig } from '../sdk/types'

export interface ProviderProps {
  appKey: string
  theme?: {
    mode?: 'light' | 'dark'
    primaryColor?: number
  }
  locale?: 'zh-CN' | 'en'
}

const props = withDefaults(defineProps<ProviderProps>(), {
  locale: 'zh-CN',
})

const clientStore = useClientStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const themeStore = useThemeStore()
const { setLocale } = useLocale()

const config: ClientConfig = {
  appKey: props.appKey,
}

const client = createClient(config)
clientStore.setClient(client)

const stores = {
  message: messageStore,
  client: clientStore,
  conversation: conversationStore,
}

const handler = createEventHandler(client, stores)

provide(UIKIT_CONTEXT_KEY, {
  client,
  stores,
  theme: themeStore,
  locale: useLocale(),
})

onMounted(() => {
  if (props.theme?.mode) {
    themeStore.setMode(props.theme.mode)
  }
  if (props.theme?.primaryColor) {
    themeStore.setPrimaryColor(props.theme.primaryColor)
  }
  setLocale(props.locale)
})

onUnmounted(() => {
  handler.dispose()
})
</script>

<template>
  <div class="uikit-provider">
    <slot />
  </div>
</template>

<style scoped>
.uikit-provider {
  width: 100%;
  height: 100%;
}
</style>
