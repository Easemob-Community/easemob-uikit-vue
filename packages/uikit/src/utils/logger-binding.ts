/**
 * UIKit 日志绑定：把统一 logger（utils/logger.ts）的全量输出接入日志持久化内核。
 *
 * 本文件是「通用内核（log-store.ts） ↔ UIKit」的胶水层，
 * 由 src/index.ts 以 side-effect 方式引入；未来抽离通用日志库时删除本文件即可。
 *
 * sink 无条件触发（不跟随 console 输出级别），保证 debug 日志也能落库。
 */
import { setLogCollector } from './logger'
import { appendLog } from './log-store'

setLogCollector((entry) => {
  appendLog({
    level: entry.level,
    source: 'uikit',
    ns: entry.ns,
    message: entry.message,
    args: entry.args,
  })
})
