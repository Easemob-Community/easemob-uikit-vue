import { createLogger } from '@easemob-community/uikit-sdk-contract'

const log = createLogger('UIKit:Webim4Client')

/** 4.x Connection 上补丁需要的最小结构（避免对 SDK 运行时模块的依赖，便于单测） */
export interface PbPatchableConnection {
  root?: {
    lookup?: (path: string) => unknown
  }
}

/** protobufjs Type 的最小结构（只取补丁需要的 decode） */
interface PbMetaType {
  decode: (...args: unknown[]) => unknown
  /** 补丁幂等标记 */
  __webim4TolerantDecode?: boolean
}

/**
 * 4.x SDK 容错补丁：pb `Meta.decode` 失败不抛出。
 *
 * 背景：漫游接口（`getHistoryMessages` 内部 `_parseMeta`）对每条消息做
 * base64 → protobuf 解码且**无 try/catch**，漫游数据里只要存在一条非法字节
 * （旧格式/非 protobuf 内容），decode 抛出 `invalid wire type` 后整页挂起
 * （Uncaught in promise，`getHistoryMessages` 永不 settle）。SDK 已停更
 * （4.24.2 为 4.x 末版），无法等官方修复，故在 adapter 侧给 `Meta.decode`
 * 包一层容错：坏消息告警并返回 `{ ns: -1 }`（非法命名空间，`_parseMeta` 的
 * `ns === 1` 判定不通过，该条被跳过），不拖垮整页拉取。
 *
 * 影响面核对（基于 4.24.2 源码）：
 * - `root` 是 SDK 模块级单例，各处 `lookup('easemob.pb.Meta')` 返回同一 Type
 *   实例，补丁全局生效一次（幂等标记防重复包装）；
 * - SDK 构造消息路径（mSync 等）decode 的都是空 buffer，不会失败，行为不变；
 * - 合并消息附件解析（connection.ts）本身有 try/catch 兜底，坏消息行为退化为
 *   解析失败 reject，不会再静默卡死。
 */
export function patchPbMetaDecode(conn: PbPatchableConnection): void {
  try {
    const metaType = conn.root?.lookup?.('easemob.pb.Meta') as PbMetaType | undefined
    if (!metaType || typeof metaType.decode !== 'function' || metaType.__webim4TolerantDecode)
      return
    const rawDecode = metaType.decode.bind(metaType)
    metaType.decode = (...args: unknown[]) => {
      try {
        return rawDecode(...args)
      }
      catch (err) {
        const bytes = args[0] as ArrayLike<number> | undefined
        const byteLength = bytes && typeof bytes.length === 'number' ? bytes.length : 0
        const preview = byteLength
          ? Array.prototype.slice.call(bytes, 0, 24)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join(' ')
          : ''
        log.warn('pb Meta 解码失败，跳过该条漫游/同步消息', { err, byteLength, preview })
        return { ns: -1 }
      }
    }
    metaType.__webim4TolerantDecode = true
  }
  catch (err) {
    // 补丁失败不阻断连接（SDK 内部结构变化时降级为原生行为）
    log.warn('patchPbMetaDecode 未生效', err)
  }
}
