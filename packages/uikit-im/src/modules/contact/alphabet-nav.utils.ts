/**
 * 字母索引条触摸滑动的纯逻辑（从 contact-alphabet-nav.vue 抽出，便于单测）。
 *
 * 移动端范式（微信通讯录）：手指按住索引条滑动时，按触点纵向位置
 * 在完整字母序列上的占比连续映射到目标字母。
 */

/**
 * 按触点相对索引条容器的纵向偏移映射字母。
 * @param offsetY 触点相对容器顶部的偏移（px），越界会被钳制到首/末字母
 * @param containerHeight 索引条容器高度（px），<=0 时无法映射
 * @param keys 完整字母序列（含空字母，如 A-Z + #）
 * @returns 命中的字母；keys 为空或容器高度非法时返回 null
 */
export function resolveAlphabetKeyByOffsetY(
  offsetY: number,
  containerHeight: number,
  keys: readonly string[],
): string | null {
  if (keys.length === 0 || containerHeight <= 0)
    return null
  const index = Math.floor((offsetY / containerHeight) * keys.length)
  const clamped = Math.min(Math.max(index, 0), keys.length - 1)
  return keys[clamped]
}
