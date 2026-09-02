// 数据源适配器与全局能力开关已下沉到中立契约包，core 保留 re-export 保持既有导入路径兼容。
export type { ContactFetchMode, UIKitDataSource, UIKitFeatures } from '@easemob/uikit-sdk-contract'
