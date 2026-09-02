import type { SdkAdapter } from '@easemob/uikit-sdk-contract'
import { createLogger } from '../utils/logger'

const logger = createLogger('UIKit:DefaultAdapter')

/**
 * 默认 SDK 适配器工厂注册表（D122 主计划决策 22）。
 *
 * 主入口（core / uikit-im）保持零 adapter 静态引用以保证摇树隔离：
 * 4.x 下游的依赖图与产物中不应出现 5.x adapter 符号，反之亦然。
 * 「未传 adapter 时内置默认」的快捷方式由场景包子路径入口承担——
 * 例如 `import '@easemob/uikit-im/websdk5'` 会在 import 时调用
 * `registerDefaultSdkAdapterFactory(() => new Websdk5Adapter())` 完成自注册。
 */
let defaultAdapterFactory: (() => SdkAdapter) | null = null

/**
 * 注册默认适配器工厂（由 adapter 子路径入口在 import 时调用）。
 * 重复注册以最后一次为准并告警（多入口并存时便于发现配置冲突）。
 */
export function registerDefaultSdkAdapterFactory(factory: () => SdkAdapter): void {
  if (defaultAdapterFactory && defaultAdapterFactory !== factory) {
    logger.warn('[UIKit] 默认 SDK 适配器工厂被重复注册，以最后一次注册为准')
  }
  defaultAdapterFactory = factory
  logger.debug('[UIKit] 默认 SDK 适配器工厂已注册')
}

/** 读取已注册的默认适配器工厂（core Provider 未收到 adapter prop 时使用） */
export function getDefaultSdkAdapterFactory(): (() => SdkAdapter) | null {
  return defaultAdapterFactory
}

/**
 * 当前装配中的 SDK 适配器（D122 主计划决策 20：非 Vue 上下文访问口）。
 * 由 useCoreUIKitProvider 在装配时登记、卸载时清空；
 * 供 OA 基座主进程 / 定时任务 / 其他子应用等 provide/inject 覆盖不到的场景读取。
 */
let currentAdapter: SdkAdapter | null = null

/** 获取当前 SDK 适配器（非 Vue 上下文入口）；Provider 未挂载或已卸载时返回 null */
export function getUIKitAdapter(): SdkAdapter | null {
  return currentAdapter
}

/** 登记/清空当前适配器——仅限 core Provider 装配内部调用，业务方请用 getUIKitAdapter */
export function setCurrentUIKitAdapter(adapter: SdkAdapter | null): void {
  currentAdapter = adapter
}
