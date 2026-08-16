import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { useViewport } from '@easemob/uikit-core'
import type { ChatroomPopupModeValue } from './use-chatroom-scene'

/** 解析后的弹层形态：sheet 底部弹层 / dialog 居中弹窗 */
export type ChatroomPopupModeResolvedValue = 'sheet' | 'dialog'

/**
 * 弹层形态解析（P5 PC 模式）：H5 的底部弹层（成员面板/礼物面板/表情面板）在
 * PC 上应退化为居中弹窗。
 *
 * - 显式 'sheet' / 'dialog'：按指定值；
 * - 'auto'（缺省）：窄视口 → sheet（H5 行为不变），宽视口 → dialog。
 *
 * 消费方：成员面板 / 礼物栏 / 输入条表情面板的 EmPopup position。
 */
export function useChatroomPopupMode(popupMode?: MaybeRefOrGetter<ChatroomPopupModeValue | undefined>) {
  const { isMobile } = useViewport()

  const resolved = computed<ChatroomPopupModeResolvedValue>(() => {
    const value = toValue(popupMode)
    if (value === 'dialog' || value === 'sheet')
      return value
    return isMobile.value ? 'sheet' : 'dialog'
  })

  return { popupMode: resolved }
}
