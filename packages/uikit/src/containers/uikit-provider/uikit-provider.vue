<script setup lang="ts">
import { provide, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useClientStore } from '../../store/client'
import { useConversationStore } from '../../store/conversation'
import { useMessageStore } from '../../store/message'
import { useGroupStore } from '../../store/group'
import { useContactStore } from '../../store/contact'
import { usePresenceStore } from '../../store/presence'
import { useThemeStore } from '../../store/theme'
import { useLocale } from '../../locale'
import { createClient } from '../../sdk/client'
import { createEventHandler } from '../../sdk/event-handler'
import { UIKIT_CONTEXT_KEY, type UIKitDataSource, type UIKitFeatures } from '../../composables/use-uikit'
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
  /**
   * 是否启用好友体系（默认 false）
   * 启用后：
   * - event-handler 挂载好友邀请/同意/删除 事件
   * - ContactContainer autoFetch 生效
   */
  enableContact?: boolean
  /**
   * 是否启用黑名单（默认 false）
   * 启用后：
   * - event-handler 挂载黑名单事件
   * - 登录完成后自动拉取黑名单列表
   */
  enableBlocklist?: boolean
  /**
   * 是否启用在线状态（默认 false）
   * 启用后：
   * - event-handler 挂载 Presence 事件
   * - 组件层 useUIKit().features.enablePresence===true 时，可通过 usePresence() 按需订阅
   */
  enablePresence?: boolean
  /** 业务接管数据源，不传走 SDK 默认 */
  dataSource?: UIKitDataSource
}

const props = withDefaults(defineProps<ProviderProps>(), {
  locale: 'zh-CN',
  autoInit: true,
  enableContact: false,
  enableBlocklist: false,
  enablePresence: false,
})

const clientStore = useClientStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const groupStore = useGroupStore()
const contactStore = useContactStore()
const presenceStore = usePresenceStore()
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
  contact: contactStore,
  presence: presenceStore,
}

/** 能力开关冻结快照，provide 下发 */
const features: UIKitFeatures = {
  enableContact: props.enableContact,
  enableBlocklist: props.enableBlocklist,
  enablePresence: props.enablePresence,
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
      handler = createEventHandler(
        newClient as UIKitClient,
        stores,
        {
          enableContact: props.enableContact,
          enableBlocklist: props.enableBlocklist,
          enablePresence: props.enablePresence,
        },
      )
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
  features,
  dataSource: props.dataSource ?? {},
})

/**
 * 登录后根据开关拉取全局副作用数据：
 * - enableBlocklist: 拉黑名单
 * - enableContact:   拉好友列表（低优先级，反正 ContactContainer 也会拉）
 * - enablePresence:  仅初始化，具体订阅交给组件按需 retain
 */
watch(
  () => clientStore.isLoggedIn,
  async (loggedIn) => {
    if (!loggedIn) {
      // 退登/断连 -> 释放上一会话产生的副作用数据
      contactStore.clearContacts()
      groupStore.clearGroups()
      presenceStore.clear()
      return
    }
    const ds = props.dataSource ?? {}
    const client = clientRef.value as UIKitClient | null
    // 黑名单
    if (props.enableBlocklist && !contactStore.blockListLoaded) {
      try {
        const list = ds.fetchBlocklist
          ? await ds.fetchBlocklist()
          : (await client?.getBlocklist() || []).map((id) => ({ userId: id, name: id }))
        contactStore.setBlackList(list)
      } catch (e) {
        console.warn('[UIKit] fetch blocklist failed:', e)
      }
    }
    // 好友列表（可选预拉）
    if (props.enableContact && !contactStore.loaded) {
      try {
        let list: Array<{ userId: string; name: string; remark?: string }> = []
        if (ds.fetchContacts) {
          list = await ds.fetchContacts()
        } else if (client) {
          const res = await client.getContactsWithCursor()
          const contacts = res.data?.contacts || []
          list = contacts.map((item) => ({
            userId: item.userId,
            name: item.remark || item.userId,
            remark: item.remark,
          }))
        }
        contactStore.setContactList(list)
      } catch (e) {
        console.warn('[UIKit] fetch contacts failed:', e)
      }
    }
  },
  { immediate: false },
)

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
