/**
 * 用户名脱敏工具（直播场景通用规范：所有消息用户名自动脱敏，中间替换为 ***，
 * 如「朱***士」）。防隐私泄露 + 直播间氛围。
 *
 * 规则：
 * - 空串 / 1 字符：原样返回；
 * - 2 字符：保留首字符 + ***（如「主播」→「主***」）；
 * - 3+ 字符：保留首尾各 1 字符，中间 ***（如「朱长士」→「朱***士」）。
 */
export function maskUsername(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 1)
    return trimmed
  if (trimmed.length === 2)
    return `${trimmed[0]}***`
  return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`
}
