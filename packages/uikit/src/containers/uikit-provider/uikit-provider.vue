<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { UserInfo } from 'easemob-websdk'
import { formatSdkError } from '../../utils/sdk-error'
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
import { useNotification } from '../../composables/use-notification'
import type { NotificationTriggerMode } from '../../composables/use-notification'
import { EmNotificationContainer, EmToast } from '../../components'
import type { NotificationItem } from '../../components/notification/types'
import type { ClientConfig } from '../../sdk/client'
import type { AnimationConfig, Density, FontSizePreset } from '../../store/theme'
import type { UiContact } from '../../sdk/types'
import { createLogger } from '../../utils/logger'

const logger = createLogger('UIKit:UikitProvider')

/** 字号配置：支持档位或具体 scale */
export type ThemeFontSize = FontSizePreset | number

export interface ProviderProps {
  appKey?: string
  sdkConfig?: Omit<ClientConfig, 'appKey'>
  autoInit?: boolean
  theme?: {
    /** 主题模式：'light' | 'dark' | 'auto'（跟随系统） */
    mode?: 'light' | 'dark' | 'auto'
    primaryColor?: number
    /** 容器间距（px），默认 8，最小 0 */
    gap?: number
    /** 组件圆角模式：'ground' 圆角（默认）| 'square' 直角 */
    shape?: 'ground' | 'square'
    /** 字号：'normal' | 'large' | 'xlarge' 或具体缩放倍数 */
    fontSize?: ThemeFontSize
    /** 密度：compact 紧凑 / normal 标准 / comfortable 宽松 */
    density?: Density
    /** 气泡颜色：传字符串时同时设置自己/对方；传对象可分别设置 */
    bubbleColor?: string | { self?: string; other?: string }
    /** 聊天背景：支持颜色 / 渐变 / url(...) 图片 */
    chatBg?: string
    /** 输入区背景 */
    inputBg?: string
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
  /**
   * 消息通知配置（默认全开，触发模式 background）。
   * 关闭后仍可通过 `useNotification()` 获取状态并自行渲染通知组件。
   */
  notification?: {
    /** 总开关（默认 true） */
    enable?: boolean
    /** 浏览器系统通知（默认 true） */
    browser?: boolean
    /** 页内右上角弹窗（默认 true） */
    inApp?: boolean
    /** 首次通知时自动请求浏览器通知权限（默认 true） */
    autoRequestPermission?: boolean
    /** 触发模式：'background' 仅页面隐藏时（默认）| 'always' 非当前会话即触发 */
    triggerMode?: NotificationTriggerMode
    /** 点击通知时跳转对应会话（默认 true） */
    navigateOnClick?: boolean
  }
  /** Token 即将过期回调，业务可在此刷新 token */
  onTokenWillExpire?: () => void
  /** Token 已过期回调，业务可在此重新登录或提示用户 */
  onTokenExpired?: () => void
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
const {
  state: notificationState,
  close: closeNotification,
  configureNotification,
  setNotificationClickHandler,
} = useNotification()
const { t } = useLocale()

const toastProps = computed(() => ({
  show: toastState.value.visible,
  message: toastState.value.message,
  type: toastState.value.type,
}))

/** 页内通知容器是否挂载（notification.enable 默认 true） */
const enableNotification = computed(() => props.notification?.enable ?? true)

const config = computed<ClientConfig>(() => ({
  appKey: props.appKey ?? '',
  ...props.sdkConfig,
}))

// features 保持响应式：useUIKitProvider 内部以 getter 读取，
// 运行时切换 enableContact / enablePresence 等 prop 即可生效
const features = computed<Partial<UIKitFeatures>>(() => ({
  enableContact: props.enableContact,
  enableBlocklist: props.enableBlocklist,
  enablePresence: props.enablePresence,
  enableGroup: props.enableGroup,
  enableUserInfo: props.enableUserInfo,
  enableUserInfoSubscription: props.enableUserInfoSubscription,
  contactFetchMode: props.contactFetchMode,
}))

const dataSource = computed(() => props.dataSource ?? {})

/**
 * 初始化 UIKit 上下文：创建 SDK Client、Domain、注册事件。
 * 当 appKey 为空时仍创建上下文，但 client 实例可能无法完成登录。
 */
const ctx = useUIKitProvider(config.value, {
  autoInit: props.autoInit,
  features,
  dataSource,
  h5: props.h5,
  onUserInfoSubscriptionPermissionError: props.enableToast
    ? () => showToastWarning(t('userInfo.subscriptionDisabled'))
    : undefined,
  connectionCallbacks: {
    onTokenWillExpire: props.onTokenWillExpire,
    onTokenExpired: props.onTokenExpired,
  },
})

/** 通知点击默认行为：聚焦页面 + 跳转对应会话（navigateOnClick=false 时仅聚焦）。
 * 进入流程与手动点击会话项保持一致（enter：SDK setCurrentConversation + store 当前会话
 * + 补发已读回执；sendChannelAck：清除未读数）。若只 setCurrentConversationId，
 * SDK 层仍认为该会话非当前会话，新消息到达时未读数先增后清，出现 1→0 闪烁。 */
function onNotificationClick(item: Omit<NotificationItem, 'id' | 'unreadCount'>) {
  window.focus()
  if (props.notification?.navigateOnClick === false)
    return
  const cvs = ctx.stores.conversation.conversationList.find(c => c.id === item.conversationId)
  if (!cvs)
    return
  ctx.domains.conversation.enter(cvs.id, cvs.type)
  // 清除该会话未读数（未读数 > 0 时向服务端清未读，0 时短路）
  void ctx.domains.conversation.sendChannelAck(cvs.id, cvs.type)
}

/** 通知配置响应式应用：开关/权限自动请求/触发模式/点击回调 */
watch(
  () => props.notification,
  (config) => {
    configureNotification({
      enabled: config?.enable,
      browserEnabled: config?.browser,
      inAppEnabled: config?.inApp,
      autoRequestPermission: config?.autoRequestPermission,
      triggerMode: config?.triggerMode,
    })
    setNotificationClickHandler(config?.navigateOnClick === false ? null : onNotificationClick)
  },
  { deep: true, immediate: true },
)

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
      ctx.stores.presence.clearPresence()
      return
    }
    const ds = dataSource.value
    const client = ctx.client.value
    if (!client)
      return

    // 黑名单
    if (features.value.enableBlocklist && !ctx.stores.contact.blockListLoaded) {
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
        logger.warn('[UIKit] fetch blocklist failed:', formatSdkError(e))
      }
    }

    // 好友列表：仅当业务提供了自定义数据源时在登录后立即拉取；
    // 默认走 SDK 的场景由 onSyncDataFinished 在数据同步完成后回填，
    // 避免在 roster 同步完成前抢跑 getContacts() 拿到空列表并锁定 loaded。
    if (features.value.enableContact && ds.fetchContacts && !ctx.stores.contact.loaded) {
      try {
        const result = await ds.fetchContacts()
        ctx.stores.contact.setContactList(result.list)
      }
      catch (e) {
        logger.warn('[UIKit] fetch contacts failed:', formatSdkError(e))
      }
    }
  },
  { immediate: false },
)

/**
 * 解析 theme.fontSize：支持档位或具体 scale
 */
function resolveFontSize(fontSize: ThemeFontSize | undefined): number | undefined {
  if (fontSize === undefined)
    return undefined
  if (typeof fontSize === 'number')
    return fontSize
  const presetMap: Record<FontSizePreset, number> = {
    normal: 1,
    large: 1.125,
    xlarge: 1.25,
  }
  return presetMap[fontSize]
}

/**
 * 应用 theme 配置到 store，未传字段保持当前值不变
 */
function applyThemeConfig(theme?: ProviderProps['theme']) {
  if (!theme)
    return
  if (theme.mode) {
    themeStore.setMode(theme.mode)
  }
  if (theme.primaryColor !== undefined) {
    themeStore.setPrimaryColor(theme.primaryColor)
  }
  if (theme.gap !== undefined) {
    themeStore.setContainerGap(theme.gap)
  }
  if (theme.shape) {
    themeStore.setComponentsShape(theme.shape)
  }
  const scale = resolveFontSize(theme.fontSize)
  if (scale !== undefined) {
    themeStore.setFontSizeScale(scale)
  }
  if (theme.density) {
    themeStore.setDensity(theme.density)
  }
  if (theme.bubbleColor !== undefined) {
    if (typeof theme.bubbleColor === 'string') {
      themeStore.setBubbleBg(theme.bubbleColor, theme.bubbleColor)
    }
    else {
      themeStore.setBubbleBg(theme.bubbleColor.other ?? null, theme.bubbleColor.self ?? null)
    }
  }
  if (theme.chatBg !== undefined) {
    themeStore.setChatBg(theme.chatBg)
  }
  if (theme.inputBg !== undefined) {
    themeStore.setInputBg(theme.inputBg)
  }
}

// theme 配置响应式应用
watch(
  () => props.theme,
  (theme) => {
    applyThemeConfig(theme)
  },
  { deep: true },
)

onMounted(() => {
  applyThemeConfig(props.theme)
  if (props.animation) {
    themeStore.applyAnimationConfig(props.animation)
  }
  // h5.fontScale 兼容：作为初始字号缩放值（若 theme.fontSize 未显式指定）
  if (props.h5?.fontScale !== undefined && props.theme?.fontSize === undefined) {
    themeStore.setFontSizeScale(props.h5.fontScale)
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
    <EmNotificationContainer
      v-if="enableNotification"
      :items="notificationState.list"
      @close="closeNotification"
      @click="onNotificationClick"
    />
  </div>
</template>

<style scoped>
.uikit-provider {
  width: 100%;
  height: 100%;
}
</style>
