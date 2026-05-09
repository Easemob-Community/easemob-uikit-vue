<script setup lang="ts">
import { provide, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useClientStore } from '../../store/client'
import { useConversationStore } from '../../store/conversation'
import { useMessageStore } from '../../store/message'
import { useGroupStore } from '../../store/group'
import { useThemeStore } from '../../store/theme'
import { useLocale } from '../../locale'
import { createClient } from '../../sdk/client'
import { createEventHandler } from '../../sdk/event-handler'
import { UIKIT_CONTEXT_KEY } from '../../composables/use-uikit'
import type { ClientConfig } from '../../sdk/types'
import type { UIKitClient } from '../../sdk/client'
import type { AnimationConfig } from '../../store/theme'

export interface ProviderProps {
  appKey?: string
  sdkConfig?: Omit<ClientConfig, 'appKey'>
  autoInit?: boolean
  theme?: {
    mode?: 'light' | 'dark'
    primaryColor?: number
  }
  locale?: 'zh-CN' | 'en'
  animation?: AnimationConfig
}

const props = withDefaults(defineProps<ProviderProps>(), {
  locale: 'zh-CN',
  autoInit: true,
})

const clientStore = useClientStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const groupStore = useGroupStore()
const themeStore = useThemeStore()
const { setLocale } = useLocale()

const { client: clientRef } = storeToRefs(clientStore)

/** 自动初始化 client */
if (props.appKey && props.autoInit) {
  const client = createClient({
    appKey: props.appKey,
    ...props.sdkConfig,
  })
  clientStore.setClient(client)
  clientStore.setAppKey(props.appKey)
}

const stores = {
  message: messageStore,
  client: clientStore,
  conversation: conversationStore,
  group: groupStore,
}

/** 当 client 实例变化时，自动挂载/卸载事件处理器 */
let handler: { dispose: () => void } | null = null

watch(
  clientRef,
  (newClient, oldClient) => {
    if (oldClient && handler) {
      handler.dispose()
      handler = null
    }
    if (newClient) {
      handler = createEventHandler(newClient as UIKitClient, stores)
      // 连接消息发送状态回写到 store
      ;(newClient as UIKitClient).setMessageStatusCallback((msgId, status) => {
        messageStore.updateMessageStatus(msgId, status)
      })
    }
  },
  { immediate: true }
)

provide(UIKIT_CONTEXT_KEY, {
  client: clientRef,
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
  if (props.animation) {
    themeStore.applyAnimationConfig(props.animation)
  }
  setLocale(props.locale)
})

onUnmounted(() => {
  handler?.dispose()
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
