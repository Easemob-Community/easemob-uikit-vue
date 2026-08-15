import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import type { UiMessage } from '@easemob/uikit-core'
import { CHATROOM_SCENE_NAME } from '../constants'
import type { ChatroomSceneNameValue } from '../constants'

/**
 * 聊天室场景预设配置（「方便用户变种」的核心机制，见设计文档 5.5）。
 * 场景 = 纯配置 + 插槽覆盖，不是独立代码库；变种优先级：插槽 > config > fork。
 */
export interface ChatroomSceneConfig {
  /** 场景名（内置 live / voice / class；custom 或自定义字符串走注册表） */
  name: ChatroomSceneNameValue | (string & {})
  /** 布局：fullscreen 全屏房间（H5 优先）/ split 分栏（桌面） */
  layout: 'fullscreen' | 'split'
  features: {
    /** 礼物栏 / 礼物消息渲染 */
    gift?: boolean
    /** 麦位管理（语聊房） */
    micQueue?: boolean
    /** 成员列表形态：面板 / 弹层 / 不展示 */
    memberList?: 'panel' | 'popup' | 'none'
    /** 公告展示 */
    announcement?: boolean
    /** 全员禁言入口 */
    muteAll?: boolean
    /** 消息过滤器（如语聊房过滤图片消息）；返回 false 不上屏 */
    messageFilter?: (message: UiMessage) => boolean
  }
  /** 主题 CSS 变量覆盖 */
  themeOverrides?: Record<string, string>
  /** 文案覆盖（key → 文案，并入 locale） */
  i18nOverrides?: Record<string, string>
}

/** 场景预设注册表（内置 preset 常量在 P2-2/P3 落地后经 registerChatroomScene 登记） */
const sceneRegistry = new Map<string, ChatroomSceneConfig>()

/** 注册场景预设（包内置 preset 与业务自定义场景共用此入口） */
export function registerChatroomScene(preset: ChatroomSceneConfig): void {
  sceneRegistry.set(preset.name, preset)
}

/** 兜底场景：全屏 + 成员面板 + 公告，无场景特性开关 */
const DEFAULT_SCENE: ChatroomSceneConfig = {
  name: CHATROOM_SCENE_NAME.CUSTOM,
  layout: 'fullscreen',
  features: {
    memberList: 'panel',
    announcement: true,
  },
}

/**
 * 解析场景配置：字符串按注册表查找（未注册回落兜底场景），
 * 部分配置对象与注册表 preset / 兜底场景合并（features 浅合并）。
 */
export function resolveChatroomScene(
  scene?: string | Partial<ChatroomSceneConfig>,
): ChatroomSceneConfig {
  const base = typeof scene === 'string'
    ? (sceneRegistry.get(scene) ?? DEFAULT_SCENE)
    : (scene?.name ? (sceneRegistry.get(scene.name) ?? DEFAULT_SCENE) : DEFAULT_SCENE)
  if (!scene || typeof scene === 'string')
    return { ...base, features: { ...base.features } }
  return {
    ...base,
    ...scene,
    name: scene.name ?? base.name,
    layout: scene.layout ?? base.layout,
    features: { ...base.features, ...scene.features },
    themeOverrides: { ...base.themeOverrides, ...scene.themeOverrides },
    i18nOverrides: { ...base.i18nOverrides, ...scene.i18nOverrides },
  }
}

/**
 * 场景预设加载器（机制与类型先行；三个内置 preset 常量在 P2-2/P3 落地）。
 * EmChatroomContainer（P2-2）读取 config 条件渲染内置块，每个边界开命名插槽。
 */
export function useChatroomScene(scene?: MaybeRefOrGetter<string | Partial<ChatroomSceneConfig> | undefined>) {
  const sceneConfig = computed(() => resolveChatroomScene(toValue(scene)))
  const features = computed(() => sceneConfig.value.features)
  const layout = computed(() => sceneConfig.value.layout)

  return {
    sceneConfig,
    features,
    layout,
  }
}
