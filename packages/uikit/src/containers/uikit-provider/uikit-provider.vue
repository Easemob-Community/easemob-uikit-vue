<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { Contact, UserInfo } from 'easemob-websdk'
import {
  type ContactFetchMode,
  type UIKitDataSource,
  type UIKitFeatures,
  useUIKitProvider,
} from '../../composables/use-uikit'
import { useLocale } from '../../locale'
import { useThemeStore } from '../../store/theme'
import type { ClientConfig } from '../../sdk/client'
import type { AnimationConfig } from '../../store/theme'
import type { UiContact } from '../../sdk/types'

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
   */
  enableContact?: boolean
  /**
   * 联系人拉取模式（默认 'page'）
   * - 'page': 目前 SDK 未暴露分页游标接口，实际按全量返回处理
   * - 'all':  一次性全量拉取
   */
  contactFetchMode?: ContactFetchMode
  /**
   * 是否启用黑名单（默认 false）
   */
  enableBlocklist?: boolean
  /**
   * 是否启用在线状态（默认 false）
   */
  enablePresence?: boolean
  /**
   * 是否启用群组体系（默认 true）
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

const { setLocale } = useLocale()
const themeStore = useThemeStore()

const config = computed<ClientConfig>(() => ({
  appKey: props.appKey ?? '',
  ...props.sdkConfig,
}))

const features: UIKitFeatures = {
  enableContact: props.enableContact,
  enableBlocklist: props.enableBlocklist,
  enablePresence: props.enablePresence,
  enableGroup: props.enableGroup,
  contactFetchMode: props.contactFetchMode,
}

const dataSource = computed(() => props.dataSource ?? {})

/**
 * 初始化 UIKit 上下文：创建 SDK Client、Domain、注册事件。
 * 当 appKey 为空时仍创建上下文，但 client 实例可能无法完成登录。
 */
const ctx = useUIKitProvider(config.value, {
  autoInit: props.autoInit,
  features,
  dataSource: dataSource.value,
})

/**
 * 登录后根据开关拉取全局副作用数据：
 * - enableBlocklist: 拉黑名单
 * - enableContact:   拉好友列表
 * - enablePresence:  具体订阅交给组件按需 retain
 */
watch(
  () => ctx.stores.client.isLoggedIn,
  async (loggedIn) => {
    if (!loggedIn) {
      ctx.stores.contact.clearContacts()
      ctx.stores.group.clearGroups()
      ctx.stores.presence.clear()
      return
    }
    const ds = dataSource.value
    const client = ctx.client.value
    if (!client)
      return

    // 黑名单
    if (features.enableBlocklist && !ctx.stores.contact.blockListLoaded) {
      try {
        const list: UiContact[] = ds.fetchBlocklist
          ? await ds.fetchBlocklist()
          : (await client.contactManager.getBlocklist()).map((userInfo: UserInfo) => ({
            userId: userInfo.userId || '',
            name: userInfo.nickname || userInfo.userId || '',
          }))
        ctx.stores.contact.setBlackList(list)
      }
      catch (e) {
        console.warn('[UIKit] fetch blocklist failed:', e)
      }
    }

    // 好友列表（可选预拉）
    if (features.enableContact && !ctx.stores.contact.loaded) {
      try {
        const res = client.contactManager.getContacts()
        const data = Array.isArray(res) ? res : []
        const list = data.map((item: Contact) => ({
          userId: item.userId,
          name: item.remark || item.userId,
          remark: item.remark,
        }))
        ctx.stores.contact.setContactList(list)
      }
      catch (e) {
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
