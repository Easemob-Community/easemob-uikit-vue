<script setup lang="ts">
import { computed, watch } from 'vue'
import type { UserInfo } from 'easemob-websdk'
import { formatSdkError } from '@easemob/uikit-core'
import {
  type ContactFetchMode,
  type H5AdaptationConfig,
  type UIKitDataSource,
  type UIKitFeatures,
  useUIKitProvider,
} from '../../composables/use-uikit'
import { createUserInfoSubscriptionErrorHandler, useProviderSideEffects } from '@easemob/uikit-core'
import { EmNotificationContainer, EmToast } from '../../components'
import type { NotificationItem } from '@easemob/uikit-core'
import type { ClientConfig } from '@easemob/uikit-core'
import type { AnimationConfig, Density, FontSizePreset } from '@easemob/uikit-core'
import type { UiContact } from '@easemob/uikit-core'
import type { NoticeConfig } from '@easemob/uikit-core'
import type { NotificationChannel, NotificationTriggerMode } from '@easemob/uikit-core'
import { createLogger } from '@easemob/uikit-core'

const logger = createLogger('UIKit:UikitProvider')

/** 字号配置：支持档位或具体 scale */
export type ThemeFontSize = FontSizePreset | number

export interface ProviderProps {
  /** 环信应用标识 AppKey（orgName#appName），由环信控制台创建应用获取 */
  appKey?: string
  /** SDK 客户端配置（除 appKey 外的 ClientConfig，如 debug / enableSyncData 等），与 appKey 合并后初始化 SDK */
  sdkConfig?: Omit<ClientConfig, 'appKey'>
  /** 是否自动初始化 SDK 连接（默认 true）：false 时延迟初始化，待业务调用 useClient().init(config) 传入 appKey 后创建 */
  autoInit?: boolean
  /** 全局主题配置：模式 / 品牌色 / 间距 / 圆角 / 字号 / 密度 / 气泡与背景色，挂载时应用 */
  theme?: {
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
    bubbleColor?: string | { self?: string; other?: string }
    /** 聊天背景：支持颜色 / 渐变 / url(...) 图片 */
    chatBg?: string
    /** 输入区背景 */
    inputBg?: string
  }
  /** 界面语言：zh-CN 中文（默认） / en 英文 */
  locale?: 'zh-CN' | 'en'
  /** 全局动画配置：enabled 总开关 / level 强度（subtle|normal|expressive）/ ripple 波纹，挂载时应用一次 */
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
  /** Token 即将过期回调，业务可在此刷新 token */
  onTokenWillExpire?: () => void
  /** Token 已过期回调，业务可在此重新登录或提示用户 */
  onTokenExpired?: () => void
  /**
   * 日志持久化配置（IndexedDB 本地落库，用于问题排查）。
   * Log persistence config (IndexedDB, for troubleshooting).
   */
  logger?: {
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
  enableDraft: true,
  enableAtMe: true,
  enableTyping: true,
  enableToast: true,
})

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
  enableDraft: props.enableDraft,
  enableAtMe: props.enableAtMe,
  enableTyping: props.enableTyping,
}))

const dataSource = computed(() => props.dataSource ?? {})

const noticeConfig = computed(() => props.noticeConfig ?? {})

/**
 * 初始化 UIKit 上下文：创建 SDK Client、Domain、注册事件。
 * 当 appKey 为空时仍创建上下文，但 client 实例可能无法完成登录。
 */
const ctx = useUIKitProvider(config.value, {
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

/** 通知点击跳转对应会话（window.focus 与 navigateOnClick 判定由共享副作用统一处理）。
 * 进入流程与手动点击会话项保持一致（enter：SDK setCurrentConversation + store 当前会话
 * + 补发已读回执；sendChannelAck：清除未读数）。若只 setCurrentConversationId，
 * SDK 层仍认为该会话非当前会话，新消息到达时未读数先增后清，出现 1→0 闪烁。 */
function navigateToConversation(item: Omit<NotificationItem, 'id' | 'unreadCount'>) {
  const cvs = ctx.stores.conversation.conversationList.find(c => c.id === item.conversationId)
  if (!cvs)
    return
  ctx.domains.conversation.enter(cvs.id, cvs.type)
  // 清除该会话未读数（未读数 > 0 时向服务端清未读，0 时短路）
  void ctx.domains.conversation.sendChannelAck(cvs.id, cvs.type)
}

/** 场景无关副作用（theme/locale/animation/h5 安全区/通知/日志 watch）走 core 共享实现，
 * 本组件只保留场景增量（通知跳会话 + 登录副作用 watch）。 */
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
  onNotificationClick: navigateToConversation,
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
