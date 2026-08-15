<script setup lang="ts">
import { computed } from 'vue'
import type { ClientConfig } from '../../sdk/client'
import type { NoticeConfig } from '../../sdk/event/notice-utils'
import type { AnimationConfig } from '../../store/theme'
import type { NotificationItem } from '../../components/notification/types'
import type { ContactFetchMode, UIKitDataSource, UIKitFeatures } from '../../composables/types'
import type { H5AdaptationConfig } from '../../composables/use-h5-adaptation'
import { useCoreUIKitProvider } from '../../composables/use-uikit'
import {
  type ProviderLoggerConfig,
  type ProviderNotificationConfig,
  type ProviderThemeConfig,
  createUserInfoSubscriptionErrorHandler,
  useProviderSideEffects,
} from '../../composables/use-provider-side-effects'
import { EmNotificationContainer, EmToast } from '../../components'

export interface CoreProviderProps {
  /** 环信应用标识 AppKey（orgName#appName），由环信控制台创建应用获取 */
  appKey?: string
  /** SDK 客户端配置（除 appKey 外的 ClientConfig，如 debug / enableSyncData 等），与 appKey 合并后初始化 SDK */
  sdkConfig?: Omit<ClientConfig, 'appKey'>
  /** 是否自动初始化 SDK 连接（默认 true）：false 时延迟初始化，待业务调用 useClient().init(config) 传入 appKey 后创建 */
  autoInit?: boolean
  /** 全局主题配置：模式 / 品牌色 / 间距 / 圆角 / 字号 / 密度 / 气泡与背景色，挂载时应用 */
  theme?: ProviderThemeConfig
  /** 界面语言：zh-CN 中文（默认） / en 英文 */
  locale?: 'zh-CN' | 'en'
  /** 全局动画配置：enabled 总开关 / level 强度（subtle|normal|expressive）/ ripple 波纹，挂载时应用一次 */
  animation?: AnimationConfig
  /**
   * H5 适配配置：安全区、键盘适配、下拉刷新等。
   * 默认 safeArea=true, keyboardAdapt=true, pullRefresh='auto'。
   */
  h5?: H5AdaptationConfig
  // —— features 相关开关（UIKitFeatures 为 core 契约）：core Provider 接受并原样透传入 context，不解释语义 ——
  /** 是否启用好友体系（默认 false） */
  enableContact?: boolean
  /**
   * 联系人拉取模式（默认 'page'）
   * - 'page': 目前 SDK 未暴露分页游标接口，实际按全量返回处理
   * - 'all':  一次性全量拉取
   */
  contactFetchMode?: ContactFetchMode
  /** 是否启用黑名单（默认 false） */
  enableBlocklist?: boolean
  /** 是否启用在线状态（默认 false） */
  enablePresence?: boolean
  /** 是否启用群组体系（默认 true） */
  enableGroup?: boolean
  /** 是否启用用户资料（昵称/头像等）展示与拉取（默认 true） */
  enableUserInfo?: boolean
  /**
   * 是否启用陌生人用户资料变更订阅（默认 true）。
   * 若服务端未开通该能力，会提示用户开通并自动熔断后续订阅。
   */
  enableUserInfoSubscription?: boolean
  /** 是否启用会话列表草稿显示（默认 true） */
  enableDraft?: boolean
  /** 是否启用 @我 提示（默认 true） */
  enableAtMe?: boolean
  /** 是否启用对方正在输入提示（默认 true） */
  enableTyping?: boolean
  /** 业务接管数据源，不传走 SDK 默认 */
  dataSource?: UIKitDataSource
  /**
   * 系统通知自定义配置：renderText 自定义文案（俏皮/严肃话术等）、
   * filter 条件隐藏、disabledEvents 直接禁用某类事件。默认全开，按内置多语言文案展示。
   * 支持响应式对象，运行时变更即刻生效。
   * System notice customization: renderText to rewrite the copy, filter to hide
   * conditionally, disabledEvents to disable certain event types.
   */
  noticeConfig?: NoticeConfig
  /**
   * 是否启用内置 Toast 提示（默认 true）。
   * 关闭后仍可通过 `useToast()` 获取状态并自行渲染提示组件。
   */
  enableToast?: boolean
  /**
   * 消息通知配置（默认全开，触发模式 background）。
   * 关闭后仍可通过 `useNotification()` 获取状态并自行渲染通知组件。
   */
  notification?: ProviderNotificationConfig
  /**
   * 通知点击回调：未传时默认行为仅 window.focus()；
   * notification.navigateOnClick=false 时不触发该回调（点击仅聚焦）。
   * 场景包（如 uikit-im）在此注入跳会话等场景行为。
   */
  onNotificationClick?: (item: Omit<NotificationItem, 'id' | 'unreadCount'>) => void
  /** Token 即将过期回调，业务可在此刷新 token */
  onTokenWillExpire?: () => void
  /** Token 已过期回调，业务可在此重新登录或提示用户 */
  onTokenExpired?: () => void
  /**
   * 日志持久化配置（IndexedDB 本地落库，用于问题排查）。
   * Log persistence config (IndexedDB, for troubleshooting).
   */
  logger?: ProviderLoggerConfig
}

const props = withDefaults(defineProps<CoreProviderProps>(), {
  locale: 'zh-CN',
  autoInit: true,
  enableContact: false,
  enableBlocklist: false,
  enablePresence: false,
  enableGroup: true,
  enableUserInfo: true,
  enableUserInfoSubscription: true,
  contactFetchMode: 'page',
  enableDraft: true,
  enableAtMe: true,
  enableTyping: true,
  enableToast: true,
})

const config = computed<ClientConfig>(() => ({
  appKey: props.appKey ?? '',
  ...props.sdkConfig,
}))

// features 保持响应式：useCoreUIKitProvider 内部以 getter 读取，
// 运行时切换 enableContact / enablePresence 等 prop 即可生效
const features = computed<Partial<UIKitFeatures>>(() => ({
  enableContact: props.enableContact,
  enableBlocklist: props.enableBlocklist,
  enablePresence: props.enablePresence,
  enableGroup: props.enableGroup,
  enableUserInfo: props.enableUserInfo,
  enableUserInfoSubscription: props.enableUserInfoSubscription,
  contactFetchMode: props.contactFetchMode,
  enableDraft: props.enableDraft,
  enableAtMe: props.enableAtMe,
  enableTyping: props.enableTyping,
}))

const dataSource = computed(() => props.dataSource ?? {})

const noticeConfig = computed(() => props.noticeConfig ?? {})

/**
 * 初始化 core UIKit 上下文：创建 SDK Client、core Domain、连接级事件。
 * 当 appKey 为空时仍创建上下文，但 client 实例可能无法完成登录。
 */
useCoreUIKitProvider(config.value, {
  autoInit: props.autoInit,
  features,
  dataSource,
  noticeConfig,
  h5: props.h5,
  onUserInfoSubscriptionPermissionError: createUserInfoSubscriptionErrorHandler(props.enableToast),
  connectionCallbacks: {
    onTokenWillExpire: props.onTokenWillExpire,
    onTokenExpired: props.onTokenExpired,
  },
})

/** 场景无关副作用（theme/locale/animation/h5 安全区/通知/日志 watch）走 core 共享实现 */
const {
  toastProps,
  enableNotification,
  notificationState,
  closeNotification,
  handleNotificationClick,
} = useProviderSideEffects({
  theme: () => props.theme,
  locale: () => props.locale,
  animation: () => props.animation,
  h5: () => props.h5,
  notification: () => props.notification,
  logger: () => props.logger,
  // 包一层稳定闭包：运行时替换 onNotificationClick prop 即刻生效
  onNotificationClick: item => props.onNotificationClick?.(item),
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
      @click="handleNotificationClick"
    />
  </div>
</template>

<style scoped>
.uikit-provider {
  width: 100%;
  height: 100%;
}
</style>
