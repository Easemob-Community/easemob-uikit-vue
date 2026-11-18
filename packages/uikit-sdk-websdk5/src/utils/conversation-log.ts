interface SnapshotLogger {
  info: (message: string, data?: unknown) => void
}

/**
 * 小列表完整打印的阈值。
 * 千级会话每次更新都全量 dump 会把日志放大到 MB 级并带来可观的 JSON 序列化开销，
 * 超过阈值时只记录数量与少量样本，保证还能定位“列表是否完整/首项是谁”。
 */
export const CONVERSATION_SNAPSHOT_FULL_LIMIT = 20

/** 大列表样本条数 */
const CONVERSATION_SNAPSHOT_SAMPLE_SIZE = 3

/**
 * 会话列表快照日志（保留 `getConversationList raw` 前缀，便于既有排查命令继续可用）。
 */
export function logConversationSnapshot(
  logger: SnapshotLogger,
  label: string,
  items: readonly unknown[],
): void {
  if (items.length <= CONVERSATION_SNAPSHOT_FULL_LIMIT) {
    logger.info(`getConversationList raw (${label})`, items)
    return
  }
  logger.info(`getConversationList raw (${label})`, {
    count: items.length,
    sampleSize: CONVERSATION_SNAPSHOT_SAMPLE_SIZE,
    sample: items.slice(0, CONVERSATION_SNAPSHOT_SAMPLE_SIZE),
  })
}
