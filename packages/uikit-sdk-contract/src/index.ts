// @easemob/uikit-sdk-contract 中立契约包入口
// 职责：中立 wire 类型 + 能力矩阵 + 数据入口接口 + adapter 接口。
// 零 SDK / 零 vue / 零 pinia 依赖，作为 uikit-im / core / adapter 三方共享的单一真相源。

// 中立常量
export * from './constants'

// 中立类型（SdkMessage / MessageBody / UiConversation / UiContact / UiGroup / UiPresence / UserInfo …）
export * from './types'

// 中立事件集
export * from './events'

// 中立纯工具（logger 暂留 core，见迁移注记）
export * from './utils/normalize-user-id'
export * from './message-preview'
export * from './stream-message'

// 数据入口（repository）
export * from './repository'

// 能力矩阵
export * from './capabilities'

// 初始化配置
export * from './config'

// adapter 接口
export * from './adapter'
