/**
 * 日志工具（单一真相源已下沉 `@easemob/uikit-sdk-contract`，core 侧 re-export 保持既有导入路径兼容）。
 * 详情见契约包 `src/utils/logger.ts`。
 */
export {
  createLogger,
  getLogLevel,
  log,
  logger,
  setLogCollector,
  setLogLevel,
} from '@easemob/uikit-sdk-contract'
export type {
  LogCollector,
  Logger,
  LogLevel,
} from '@easemob/uikit-sdk-contract'
