/**
 * URL 识别与文本分片工具
 * 将纯文本拆分为 text / link 片段，用于渲染可点击链接
 */

/** 文本片段类型 */
export interface LinkSegment {
  type: 'text' | 'link'
  /** 原始文本（link 类型时为 URL 字符串） */
  value: string
  /** 仅 link 类型：补全协议后的完整 href */
  href?: string
}

/**
 * URL 匹配正则
 * 覆盖场景：
 * - http:// / https:// 开头
 * - www. 开头（无协议）
 * - 带路径、查询参数、hash
 * 排除尾部标点（中英文句号、逗号、分号等）
 */
/**
 * URL 匹配正则（ReDoS 安全版本）
 * 限制：
 * - 最大匹配长度 2048 字符（防止灾难性回溯）
 * - 使用原子组模拟（通过排除集避免嵌套量词回溯）
 */
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"'()[\]{}，。；！？、]{0,2048}[^\s<>"'()[\]{}，。；！？、.,;:!?)}\]]/gi

/**
 * 将文本解析为 text/link 片段数组
 * 若文本不含 URL，返回单个 text 片段
 */
export function linkify(text: string): LinkSegment[] {
  if (!text) return []

  const segments: LinkSegment[] = []
  let lastIndex = 0

  // 每次调用重置 lastIndex（全局正则需要）
  URL_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0]
    const start = match.index

    // 匹配位置之前的纯文本
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) })
    }

    // URL 片段：补全协议
    const href = url.startsWith('http') ? url : `https://${url}`
    segments.push({ type: 'link', value: url, href })

    lastIndex = start + url.length
  }

  // 剩余纯文本
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  // 全文无 URL 时返回单个 text 片段
  if (segments.length === 0) {
    segments.push({ type: 'text', value: text })
  }

  return segments
}

/**
 * 快速判断文本中是否包含 URL
 */
export function hasUrl(text: string): boolean {
  if (!text) return false
  URL_REGEX.lastIndex = 0
  return URL_REGEX.test(text)
}
