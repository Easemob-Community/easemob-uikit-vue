<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { UserInfo } from 'easemob-websdk'
import {
  type ContactFetchMode,
  type H5AdaptationConfig,
  type UIKitDataSource,
  type UIKitFeatures,
  useUIKitProvider,
} from '../../composables/use-uikit'
import { useLocale } from '../../locale'
import { useThemeStore } from '../../store/theme'
import { useToast } from '../../composables/use-toast'
import { EmToast } from '../../components'
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
   * H5 适配配置：安全区、键盘适配、下拉刷新等。
   * 默认 safeArea=true, keyboardAdapt=true, pullRefresh='auto'。
   */
  h5?: H5AdaptationConfig
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
  /**
   * 是否启用用户资料（昵称/头像等）展示与拉取（默认 true）
   */
  enableUserInfo?: boolean
  /**
   * 是否启用陌生人用户资料变更订阅（默认 true）。
   * 若服务端未开通该能力，会提示用户开通并自动熔断后续订阅。
   */
  enableUserInfoSubscription?: boolean
  /** 业务接管数据源，不传走 SDK 默认 */
  dataSource?: UIKitDataSource
  /**
   * 是否启用内置 Toast 提示（默认 true）。
   * 关闭后仍可通过 `useToast()` 获取状态并自行渲染提示组件。
   */
  enableToast?: boolean
}

const props = withDefaults(defineProps<ProviderProps>(), {
  locale: 'zh-CN',
  autoInit: true,
  enableContact: false,
  enableBlocklist: false,
  enablePresence: false,
  enableGroup: true,
  enableUserInfo: true,
  enableUserInfoSubscription: true,
  contactFetchMode: 'page',
  enableToast: true,
})

const { setLocale } = useLocale()
const themeStore = useThemeStore()
const { state: toastState, warning: showToastWarning } = useToast()
const { t } = useLocale()

const toastProps = computed(() => ({
  show: toastState.value.visible,
  message: toastState.value.message,
  type: toastState.value.type,
}))

const config = computed<ClientConfig>(() => ({
  appKey: props.appKey ?? '',
  ...props.sdkConfig,
}))

const features: UIKitFeatures = {
  enableContact: props.enableContact,
  enableBlocklist: props.enableBlocklist,
  enablePresence: props.enablePresence,
  enableGroup: props.enableGroup,
  enableUserInfo: props.enableUserInfo,
  enableUserInfoSubscription: props.enableUserInfoSubscription,
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
  h5: props.h5,
  onUserInfoSubscriptionPermissionError: props.enableToast
    ? () => showToastWarning(t('userInfo.subscriptionDisabled'))
    : undefined,
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

    // 好友列表：仅当业务提供了自定义数据源时在登录后立即拉取；
    // 默认走 SDK 的场景由 onSyncDataFinished 在数据同步完成后回填，
    // 避免在 roster 同步完成前抢跑 getContacts() 拿到空列表并锁定 loaded。
    if (features.enableContact && ds.fetchContacts && !ctx.stores.contact.loaded) {
      try {
        const result = await ds.fetchContacts()
        ctx.stores.contact.setContactList(result.list)
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
  // H5 安全区开关：关闭时把 env() 变量覆写为 0，避免组件仍读取到刘海高度
  if (props.h5?.safeArea === false) {
    const root = document.documentElement
    root.style.setProperty('--uikit-safe-top', '0px')
    root.style.setProperty('--uikit-safe-right', '0px')
    root.style.setProperty('--uikit-safe-bottom', '0px')
    root.style.setProperty('--uikit-safe-left', '0px')
  }
  setLocale(props.locale)
})
</script>

<template>
  <div class="uikit-provider">
    <slot />
    <EmToast v-if="props.enableToast" v-bind="toastProps" />
  </div>
</template>

<style scoped>
.uikit-provider {
  width: 100%;
  height: 100%;
}
</style>
