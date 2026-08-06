/**
 * 全局弹层 z-index 分配器。
 *
 * 解决「所有弹层默认 zIndex 2000、嵌套弹窗靠 DOM 顺序」的问题：
 * 每次有新弹层打开时分配一个递增的 z-index，确保后开的弹层在上层。
 */

const BASE_Z_INDEX = 2000
let current = BASE_Z_INDEX

/** 获取下一个弹层 z-index（递增，不复用） */
export function nextZIndex(): number {
  current += 1
  return current
}

/** 重置为基准值（测试/登出场景） */
export function resetZIndex(): void {
  current = BASE_Z_INDEX
}
