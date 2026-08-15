import { type MaybeRefOrGetter, computed, toValue, watch } from 'vue'
import type { UiMessage } from '@easemob/uikit-core'
import { MESSAGE_TYPE, getLocale, mergeLocaleMessages } from '@easemob/uikit-core'
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
    /**
     * 消息区形态（直播场景：弹幕区只占页面底部一部分且背景透明，
     * 直播画面从下层透出——用户 P4 review 需求 1）。缺省：消息区 flex:1
     * 撑满 + 不透明背景。live preset 默认 { height: '33%', transparent: true }。
     */
    messageArea?: {
      /** 高度（px 数字或 CSS 长度字符串，如 '33%' / '240px'） */
      height?: number | string
      /** 背景透明（直播画面透出）；消息气泡自身背景不受影响 */
      transparent?: boolean
    }
  }
  /** 主题 CSS 变量覆盖（容器根元素应用，如 '--uikit-primary-color': '#ff6b6b'） */
  themeOverrides?: Record<string, string>
  /** 文案覆盖（key → 文案，经 core mergeLocaleMessages 并入当前语言包） */
  i18nOverrides?: Record<string, string>
}

/** 场景预设注册表（内置 preset 在模块加载时登记；业务自定义场景共用此入口） */
const sceneRegistry = new Map<string, ChatroomSceneConfig>()

/** 注册场景预设（包内置 preset 与业务自定义场景共用此入口；同名覆盖） */
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
 * 直播间 preset：全屏 + 礼物 + 成员弹层 + 公告 + 全员禁言入口；
 * 消息区 = 底部 33% + 透明背景（弹幕叠加在直播画面上，P4 review 需求 1）。
 */
export const LIVE_ROOM_SCENE: ChatroomSceneConfig = {
  name: CHATROOM_SCENE_NAME.LIVE,
  layout: 'fullscreen',
  features: {
    gift: true,
    memberList: 'popup',
    announcement: true,
    muteAll: true,
    messageArea: { height: '33%', transparent: true },
  },
}

/**
 * 语聊房 preset：全屏 + 麦位管理 + 成员面板 + 公告 + 全员禁言；
 * messageFilter 过滤图片消息（语聊房以语音/文字互动为主，设计文档 §5.5 示例）。
 */
export const VOICE_ROOM_SCENE: ChatroomSceneConfig = {
  name: CHATROOM_SCENE_NAME.VOICE,
  layout: 'fullscreen',
  features: {
    micQueue: true,
    memberList: 'panel',
    announcement: true,
    muteAll: true,
    messageFilter: message => message.type !== MESSAGE_TYPE.IMAGE,
  },
}

/**
 * 小班课 preset：全屏 + 成员面板 + 公告（课堂纪律优先，无礼物/麦位）。
 */
export const CLASS_ROOM_SCENE: ChatroomSceneConfig = {
  name: CHATROOM_SCENE_NAME.CLASS,
  layout: 'fullscreen',
  features: {
    memberList: 'panel',
    announcement: true,
    muteAll: true,
  },
}

// 内置 preset 登记（模块加载即注册，业务直接传 'live'/'voice'/'class' 生效）
registerChatroomScene(LIVE_ROOM_SCENE)
registerChatroomScene(VOICE_ROOM_SCENE)
registerChatroomScene(CLASS_ROOM_SCENE)

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
 * 场景预设加载器：解析 scene prop → sceneConfig（含 features 视图）；
 * i18nOverrides 变化时并入当前语言包（mergeLocaleMessages 覆盖式，同 key 后者生效；
 * themeOverrides 由容器应用到根元素，headless 场景由业务自行消费 sceneConfig）。
 * 容器（P2-2）读取 config 条件渲染内置块，每个边界开命名插槽。
 */
export function useChatroomScene(scene?: MaybeRefOrGetter<string | Partial<ChatroomSceneConfig> | undefined>) {
  const sceneConfig = computed(() => resolveChatroomScene(toValue(scene)))
  const features = computed(() => sceneConfig.value.features)
  const layout = computed(() => sceneConfig.value.layout)

  // i18nOverrides 应用：文案覆盖并入当前语言包（响应式：scene 变化重新合并；
  // 覆盖语义为增量叠加，业务在 Provider 层面二次合并可精确控制）
  watch(
    () => sceneConfig.value.i18nOverrides,
    (overrides) => {
      if (overrides && Object.keys(overrides).length > 0)
        mergeLocaleMessages(getLocale(), overrides)
    },
    { immediate: true },
  )

  return {
    sceneConfig,
    features,
    layout,
  }
}
