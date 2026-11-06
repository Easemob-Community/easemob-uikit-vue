import { MESSAGE_STATUS } from '@easemob-community/uikit-core'
import type { MultiBodySegment, UiMessage } from '@easemob-community/uikit-core'

/** 将复合分段投影为现有单类型渲染组件的视图模型，不复制 SDK 发送对象。 */
export function toSegmentUiMessage(
  parent: UiMessage,
  segment: MultiBodySegment,
  index: number,
): UiMessage {
  const { type, ...body } = segment
  const parentId = parent.msgLocalId || parent.localId || parent.msgServerId
  const localId = `${parentId}:${index}`
  return {
    ...parent,
    type,
    body,
    msgServerId: parent.msgServerId ? `${parent.msgServerId}:${index}` : '',
    msgLocalId: localId,
    localId,
    sendStatus: MESSAGE_STATUS.SENT,
    status: MESSAGE_STATUS.SENT,
  }
}
