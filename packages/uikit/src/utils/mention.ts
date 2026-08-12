import type { MentionContact } from '../modules/chat/types'

/** @名字组成部分：字母/数字/下划线/中文/@ */
const NAME_CHAR = /[\w@\u4E00-\u9FA5]/

/**
 * 过滤出仍真实出现在文本中的 @提及（发送前兜底，防止已删除的 @ 进入 ext.em_at_list）。
 *
 * mentionList 与输入文本是解耦维护的：用户删除/修改 @ 文本后列表不会同步清理。
 * 发送前用本函数做精确匹配 —— `@name` 后必须是行尾或非名字字符，
 * 避免 `@张三` 误匹配到 `@张三丰`（前缀误判）；前面也不能是 `@`（避免 `@@张三`）。
 */
export function filterActiveMentions(text: string, mentionList: MentionContact[]): MentionContact[] {
  if (!text || !mentionList || mentionList.length === 0)
    return []
  return mentionList.filter((m) => {
    if (!m.name)
      return false
    const at = `@${m.name}`
    let idx = text.indexOf(at)
    while (idx >= 0) {
      const before = idx > 0 ? text[idx - 1] : ''
      const after = text[idx + at.length]
      if (before !== '@' && (after === undefined || !NAME_CHAR.test(after)))
        return true
      idx = text.indexOf(at, idx + 1)
    }
    return false
  })
}
