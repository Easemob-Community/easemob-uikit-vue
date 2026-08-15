import { type MaybeRefOrGetter, computed, onMounted, toValue, watch } from 'vue'
import type { NotificationItem } from '../components/notification/types'
import { useLocale } from '../locale'
import { type AnimationConfig, type Density, type FontSizePreset, useThemeStore } from '../store/theme'
import { configureLogPersistence } from '../utils/log-store'
import { setLogLevel } from '../utils/logger'
import type { H5AdaptationConfig } from './use-h5-adaptation'
import { useToast } from './use-toast'
import { type NotificationChannel, type NotificationTriggerMode, useNotification } from './use-notification'

/** 字号配置：支持档位或具体 scale */
export type ThemeFontSize = FontSizePreset | number

/** Provider 主题配置（theme prop）：模式 / 品牌色 / 间距 / 圆角 / 字号 / 密度 / 气泡与背景色 */
export interface ProviderThemeConfig {
  /** 主题模式：'light' | 'dark' | 'auto'（跟随系统） */
  mode?: 'light' | 'dark' | 'auto'
  /** 品牌色相（0-360，hsl hue），默认 203 */
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
  bubbleColor?: string | { self?: string, other?: string }
  /** 聊天背景：支持颜色 / 渐变 / url(...) 图片 */
  chatBg?: string
  /** 输入区背景 */
  inputBg?: string
}

/** Provider 消息通知配置（notification prop，默认全开，触发模式 background） */
export interface ProviderNotificationConfig {
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
  /** 点击通知时触发 onNotificationClick 回调（默认 true；false 时点击仅聚焦页面） */
  navigateOnClick?: boolean
  /**
   * 通知送达回调：判定链命中且通知实际投递（浏览器通知发出成功 / 页内弹窗入列）时触发，
   * channel 为实际投递通道。可用于播放自定义铃声、对接自定义通知服务等；
   * 音频资源与浏览器 autoplay 解锁策略由业务侧负责（UIKit 不内置铃声）。
   * Notification delivery callback, fired when a notification is actually delivered
   * ('browser' on system notification success / 'in-app' on in-app toast queued).
   * Use it to play custom sounds or hook custom notification services.
   */
  onNotify?: (item: Omit<NotificationItem, 'id' | 'unreadCount'>, channel: NotificationChannel) => void
}

/**
 * Provider 日志持久化配置（logger prop，IndexedDB 本地落库，用于问题排查）。
 * Log persistence config (IndexedDB, for troubleshooting).
 */
export interface ProviderLoggerConfig {
  /** 是否持久化 UIKit 日志（默认 true） / Persist UIKit logs (default true) */
  enabled?: boolean
  /** 是否同时收集 SDK 日志（默认 false） / Also collect SDK logs (default false) */
  collectSdkLog?: boolean
  /**
   * UIKit 层收集级别（默认 'info'），低于该级别直接丢弃。
   * 生产建议 'info'，排查时临时调 'debug'。
   * UIKit collect level (default 'info'); use 'debug' temporarily for troubleshooting.
   */
  uikitLevel?: 'debug' | 'info' | 'warn' | 'error'
  /**
   * SDK 层收集级别（默认 'warn'，SDK 无 info 级）。
   * DEBUG 含心跳等高频日志，生产建议 'warn'。
   * SDK collect level (default 'warn'; SDK has no info level).
   */
  sdkLevel?: 'debug' | 'warn' | 'error'
  /** 最大保留条数（默认 5000） / Max retained entries (default 5000) */
  maxEntries?: number
  /** 保留天数（默认 7） / Retention days (default 7) */
  retentionDays?: number
}

/** useProviderSideEffects 入参：各字段对应 Provider 的场景无关 prop，支持 ref/computed/getter 响应式传入 */
export interface ProviderSideEffectsOptions {
  /** 全局主题配置，挂载时应用 + 运行时响应式应用 */
  theme?: MaybeRefOrGetter<ProviderThemeConfig | undefined>
  /** 界面语言（挂载时 setLocale 一次） */
  locale: MaybeRefOrGetter<'zh-CN' | 'en'>
  /** 全局动画配置（挂载时应用一次） */
  animation?: MaybeRefOrGetter<AnimationConfig | undefined>
  /** H5 适配配置（fontScale 初始字号兼容 + safeArea 运行时覆写） */
  h5?: MaybeRefOrGetter<H5AdaptationConfig | undefined>
  /** 消息通知配置（响应式应用：开关/权限自动请求/触发模式/点击与送达回调） */
  notification?: MaybeRefOrGetter<ProviderNotificationConfig | undefined>
  /** 日志持久化配置（响应式应用） */
  logger?: MaybeRefOrGetter<ProviderLoggerConfig | undefined>
  /**
   * 通知点击业务回调（如跳会话）：仅当 navigateOnClick 未关闭时触发；
   * 未提供时点击通知仅聚焦页面（window.focus()）。
   */
  onNotificationClick?: (item: Omit<NotificationItem, 'id' | 'unreadCount'>) => void
}

/**
 * Provider 场景无关副作用（core Provider 与场景 Provider 共用同一实现，防复制）：
 * - theme 应用（applyThemeConfig / resolveFontSize / theme watch / animation / h5.fontScale 兼容）
 * - locale（挂载时 setLocale）
 * - h5.safeArea watch（运行时覆写/恢复 CSS 变量）
 * - notification watch（开关/触发模式/点击与送达回调注册）
 * - logger watch（日志持久化 + console 输出级别）
 *
 * 返回值供 Provider 模板直接绑定内置 Toast / 页内通知容器。
 */
export function useProviderSideEffects(options: ProviderSideEffectsOptions) {
  const themeStore = useThemeStore()
  const { setLocale } = useLocale()
  const { state: toastState } = useToast()
  const {
    state: notificationState,
    close: closeNotification,
    configureNotification,
    setNotificationClickHandler,
    setNotificationHandler,
  } = useNotification()

  /** 内置 Toast 绑定 props（Provider 模板 v-bind 使用） */
  const toastProps = computed(() => ({
    show: toastState.value.visible,
    message: toastState.value.message,
    type: toastState.value.type,
  }))

  /** 页内通知容器是否挂载（notification.enable 默认 true） */
  const enableNotification = computed(() => toValue(options.notification)?.enable ?? true)

  /**
   * 通知点击统一入口：先聚焦页面；navigateOnClick=false 时仅聚焦、不触发业务回调。
   * 业务行为（跳会话等场景逻辑）由 Provider 经 onNotificationClick 注入，未注入时仅聚焦。
   */
  function handleNotificationClick(item: Omit<NotificationItem, 'id' | 'unreadCount'>) {
    window.focus()
    if (toValue(options.notification)?.navigateOnClick === false)
      return
    options.onNotificationClick?.(item)
  }

  /** 通知配置响应式应用：开关/权限自动请求/触发模式/点击回调 */
  watch(
    () => toValue(options.notification),
    (config) => {
      configureNotification({
        enabled: config?.enable,
        browserEnabled: config?.browser,
        inAppEnabled: config?.inApp,
        autoRequestPermission: config?.autoRequestPermission,
        triggerMode: config?.triggerMode,
      })
      setNotificationClickHandler(config?.navigateOnClick === false ? null : handleNotificationClick)
      setNotificationHandler(config?.onNotify ?? null)
    },
    { deep: true, immediate: true },
  )

  /**
   * 日志配置响应式应用：
   * - 持久化（log-store）：collectSdkLog 变化时联动启停 SDK 日志捕获
   * - console 输出级别（utils/logger 全局开关）：uikitLevel 同时控制控制台输出，生产 'info'、排查临时调 'debug'（D37）
   */
  watch(
    () => toValue(options.logger),
    (loggerConfig) => {
      configureLogPersistence({
        enabled: loggerConfig?.enabled,
        collectSdkLog: loggerConfig?.collectSdkLog,
        uikitLevel: loggerConfig?.uikitLevel,
        sdkLevel: loggerConfig?.sdkLevel,
        maxEntries: loggerConfig?.maxEntries,
        retentionDays: loggerConfig?.retentionDays,
      })
      setLogLevel(loggerConfig?.uikitLevel ?? 'info')
    },
    { deep: true, immediate: true },
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
  function applyThemeConfig(theme?: ProviderThemeConfig) {
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
    () => toValue(options.theme),
    (theme) => {
      applyThemeConfig(theme)
    },
    { deep: true },
  )

  onMounted(() => {
    applyThemeConfig(toValue(options.theme))
    const animation = toValue(options.animation)
    if (animation) {
      themeStore.applyAnimationConfig(animation)
    }
    // h5.fontScale 兼容：作为初始字号缩放值（若 theme.fontSize 未显式指定）
    const h5 = toValue(options.h5)
    if (h5?.fontScale !== undefined && toValue(options.theme)?.fontSize === undefined) {
      themeStore.setFontSizeScale(h5.fontScale)
    }
    setLocale(toValue(options.locale))
  })

  /** H5 安全区开关响应式：运行期切换 :h5="{ safeArea }" 时同步覆写/恢复 CSS 变量 */
  watch(
    () => toValue(options.h5)?.safeArea,
    (safeArea) => {
      if (typeof document === 'undefined')
        return
      const root = document.documentElement
      if (safeArea === false) {
        root.style.setProperty('--uikit-safe-top', '0px')
        root.style.setProperty('--uikit-safe-right', '0px')
        root.style.setProperty('--uikit-safe-bottom', '0px')
        root.style.setProperty('--uikit-safe-left', '0px')
      }
      else {
        root.style.removeProperty('--uikit-safe-top')
        root.style.removeProperty('--uikit-safe-right')
        root.style.removeProperty('--uikit-safe-bottom')
        root.style.removeProperty('--uikit-safe-left')
      }
    },
  )

  return {
    /** 内置 Toast 绑定 props */
    toastProps,
    /** 页内通知容器是否挂载 */
    enableNotification,
    /** 页内通知状态（模板取 notificationState.list） */
    notificationState,
    /** 关闭指定页内通知 */
    closeNotification,
    /** 通知点击统一入口（页内弹窗 @click 与浏览器通知 clickHandler 共用） */
    handleNotificationClick,
  }
}

/**
 * 生成「用户资料订阅无权限/服务未开通」回调：接内置 Toast 提示；
 * enableToast=false 时不接管（返回 undefined，业务可自行处理）。
 */
export function createUserInfoSubscriptionErrorHandler(enableToast: boolean): (() => void) | undefined {
  if (!enableToast)
    return undefined
  const { warning: showToastWarning } = useToast()
  const { t } = useLocale()
  return () => showToastWarning(t('userInfo.subscriptionDisabled'))
}
