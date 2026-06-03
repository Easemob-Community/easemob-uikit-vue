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
import { UIKIT_CONTEXT_KEY, type UIKitDataSource, type UIKitFeatures, type ContactFetchMode } from '../../composables/use-uikit'
import type { ClientConfig } from '../../sdk/types'
import type { UIKitClient } from '../../sdk/client'
import type { AnimationConfig } from '../../store/theme'
import type { Contact as UIKitContact } from '../../store/contact'
import type { UserInfo } from 'im-sdk-web'

export interface ProviderProps {
  appKey?: string
  sdkConfig?: Omit<ClientConfig, 'appKey'>
  autoInit?: boolean
  theme?: {
    mode?: 'light' | 'dark'
    primaryColor?: number
    /** 容器间距（px），默认 8，最小 0 */
    gap?: number
    /** 组件圆角模式：'ground' 圆角（默认）| 'square' 直角 */
    shape?: 'ground' | 'square'
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
   * 联系人拉取模式（默认 'page'）
   * - 'page': 分页拉取（getContactsWithCursor），支持触底加载更多
   * - 'all':  一次性全量拉取（getAllContacts），无分页能力
   */
  contactFetchMode?: ContactFetchMode
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
  /**
   * 是否启用群组体系（默认 true）
   * 关闭后：
   * - ContactContainer 中群组入口/列表不展示
   * - useGroup().refresh() 等操作直接返回
   */
  enableGroup?: boolean
  /** 业务接管数据源，不传走 SDK 默认 */
  dataSource?: UIKitDataSource
}

const props = withDefaults(defineProps<ProviderProps>(), {
  locale: 'zh-CN',
  autoInit: true,
  enableContact: false,
  enableBlocklist: false,
  enablePresence: false,
  enableGroup: true,
  contactFetchMode: 'page',
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
  enableGroup: props.enableGroup,
  contactFetchMode: props.contactFetchMode,
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
          enableGroup: props.enableGroup,
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
        const list: UIKitContact[] = ds.fetchBlocklist
          ? await ds.fetchBlocklist()
          : (await client?.contact.getBlocklist() || []).map((userInfo: UserInfo) => ({
              userId: userInfo.userId || '',
              name: userInfo.nickname || userInfo.userId || '',
            }))
        contactStore.setBlackList(list)
      } catch (e) {
        console.warn('[UIKit] fetch blocklist failed:', e)
      }
    }
    // 好友列表（可选预拉）
    if (props.enableContact && !contactStore.loaded) {
      try {
        const isAllMode = props.contactFetchMode === 'all'
        let list: Array<{ userId: string; name: string; remark?: string }> = []
        if (isAllMode && client) {
          // 全量拉取模式
          const res = client.contact.getContacts()
          const data = Array.isArray(res) ? res : []
          list = data.map((item) => ({
            userId: item.userId,
            name: item.remark || item.userId,
            remark: item.remark,
          }))
          contactStore.setHasMore(false)
          contactStore.setCursor('')
        } else if (ds.fetchContacts) {
          const res = await ds.fetchContacts({ pageSize: 50 })
          list = res.list || []
          contactStore.setHasMore(!!res.hasMore)
          contactStore.setCursor(res.cursor || '')
        } else if (client) {
          /**
           * @see SDK_DEFICIENCY: getContactsWithCursor 返回值类型不确定，
           * ContactManager 不暴露此方法，由 UIKitClient 桥接。
           */
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await client.contact.getContactsWithCursor({ pageSize: 50 })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contacts = (res as any)?.data?.contacts || (res as any)?.contacts || []
          list = contacts.map((item: any) => ({
            userId: item.userId,
            name: item.remark || item.userId,
            remark: item.remark,
          }))
          contactStore.setHasMore(contacts.length >= 50)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contactStore.setCursor((res as any)?.data?.cursor || (res as any)?.cursor || '')
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
  if (props.theme?.gap !== undefined) {
    themeStore.setContainerGap(props.theme.gap)
  }
  if (props.theme?.shape) {
    themeStore.setComponentsShape(props.theme.shape)
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
