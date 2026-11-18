import { CONVERSATION_TYPE } from '@easemob-community/uikit-core'
import type { UiConversation } from '@easemob-community/uikit-core'

/**
 * 会话列表 Presence 订阅上限。
 * 千级会话全量订阅会撞服务端单次请求上限并放大请求量，首屏只订阅前 N 个单聊，
 * 更靠后的条目在虚拟列表/可见性感知落地前不订阅（见 TECH-DEBT）。
 */
export const PRESENCE_SUBSCRIBE_LIMIT = 100

/**
 * 从会话列表中挑选需要订阅 Presence 的单聊对方 ID：
 * 只取单聊、按列表顺序去重、最多 `limit` 个。
 */
export function selectPresencePeerIds(
  conversations: readonly Pick<UiConversation, 'id' | 'type'>[],
  limit: number = PRESENCE_SUBSCRIBE_LIMIT,
): string[] {
  if (limit <= 0)
    return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of conversations) {
    if (item.type !== CONVERSATION_TYPE.SINGLECHAT)
      continue
    if (!item.id || seen.has(item.id))
      continue
    seen.add(item.id)
    ids.push(item.id)
    if (ids.length >= limit)
      break
  }
  return ids
}
