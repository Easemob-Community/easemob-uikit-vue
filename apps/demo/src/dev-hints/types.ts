/**
 * Dev Hints 类型定义
 *
 * D87「Demo 开发者友好模式」v2：
 * - 统一交互：hover 目标区域出 💡 角标（默认 500ms 延时，气泡 2000ms），点击展开详情抽屉
 * - 容器级高亮：部分区域（会话列表等）hover 时显示 border 高亮框
 * - 全部在 demo 层实现，对 uikit 包零侵入
 */

/** 环信接口引用（5.x 官方文档未上线，docUrl 暂留空，展示 SDK d.ts 路径作权威来源） */
export interface DevHintApi {
  /** 接口展示名，如 `chatManager.getConversationList()` */
  name: string
  /** 一句话说明该接口在此功能中的职责 */
  note: string
  /** 官方文档链接（5.x 文档上线后补录） */
  docUrl?: string
}

/** UIKit 内实现参考文件（引用文件路径，不引用行号，避免随迭代漂移） */
export interface DevHintFileRef {
  /** 相对仓库根的文件路径，如 packages/uikit-im/src/sdk/domain/message-domain.ts */
  path: string
  /** 该文件在此功能中承担的角色 */
  desc: string
}

/** 注册表条目 */
export interface DevHintEntry {
  /** 唯一 ID */
  id: string
  /** CSS 选择器（对 hover 目标做 closest 匹配）；与 match 二选一或组合 */
  selectors: string[]
  /** 深度验证：selectors 命中后仍需通过的额外校验（如会话项需含内部信息区） */
  verify?: (el: Element) => boolean
  /** 功能名 */
  title: string
  /** 一句话摘要 */
  summary: string
  /** 环信接口清单（详情抽屉展示全部） */
  apis: DevHintApi[]
  /** UIKit 实现思路（详情抽屉展示全部） */
  implNotes: string[]
  /** UIKit 参考文件 */
  refs: DevHintFileRef[]
  /** 提示触发模式：undefined = 引擎默认延时（500ms）；>0 = 自定义延时（气泡类 2000ms 等） */
  badgeDelay?: number
  /**
   * 匹配层级：'specific' = 具体内容（气泡类型/输入框/详情面板，优先匹配，默认）；
   * 'container' = 容器级（.chat、.conversation-container 等），仅当具体内容未命中时参与匹配
   */
  scope?: 'specific' | 'container'
  /**
   * 是否在悬停时显示高亮边框（fixed overlay，pointer-events: none）。
   * 适用于容器级区域（会话列表、联系人列表等）提供视觉反馈。
   */
  highlight?: boolean
}

/** 引擎当前命中的提示上下文 */
export interface DevHintContext {
  entry: DevHintEntry
  /** 命中的 DOM 元素（角标定位用） */
  el?: HTMLElement
}

/** 💡 角标显示状态 */
export interface DevHintBadgeState {
  entry: DevHintEntry
  /** 角标位置（viewport 坐标，元素右上角外延） */
  x: number
  y: number
}
