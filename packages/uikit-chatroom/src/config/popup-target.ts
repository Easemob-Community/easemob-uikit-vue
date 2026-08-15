/**
 * 聊天室弹层 Teleport 目标（UI 适配，P4 review）：
 * EmPopup/EmActionSheet 默认 teleport 到 body，弹层按**视口**定位——嵌套
 * 弹层容器场景（如 demo-chatroom 的 375px 手机壳）下会与壳错位、宽度溢出。
 * 宿主在应用启动期调用 `setChatroomPopupTarget` 指定壳内元素
 * （配合壳的 transform 包含块，弹层随壳定位）；默认 null = body 原行为。
 */
let popupTarget: string | HTMLElement | null = null

/** 设置聊天室弹层 Teleport 目标（选择器或元素；null 恢复默认 body） */
export function setChatroomPopupTarget(target: string | HTMLElement | null): void {
  popupTarget = target
}

/** 读取当前弹层 Teleport 目标（null = body） */
export function getChatroomPopupTarget(): string | HTMLElement | null {
  return popupTarget
}
