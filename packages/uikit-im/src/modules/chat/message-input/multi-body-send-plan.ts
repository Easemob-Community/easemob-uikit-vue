import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'

type TextInput = Extract<MultiBodySegmentInput, { type: typeof MESSAGE_TYPE.TEXT }>
type ImageInput = Extract<MultiBodySegmentInput, { type: typeof MESSAGE_TYPE.IMAGE }>
type VideoInput = Extract<MultiBodySegmentInput, { type: typeof MESSAGE_TYPE.VIDEO }>
type FileInput = Extract<MultiBodySegmentInput, { type: typeof MESSAGE_TYPE.FILE }>

export function canUseConversationForSend(expectedId: string, currentId?: string): boolean {
  return Boolean(expectedId) && expectedId === currentId
}

export type MultiBodySendPlan
  = | { kind: 'empty' }
    | { kind: 'tooMany', count: number }
    | { kind: 'text', body: TextInput }
    | { kind: 'image', body: ImageInput }
    | { kind: 'video', body: VideoInput }
    | { kind: 'file', body: FileInput }
    | { kind: 'multiBody', bodies: readonly MultiBodySegmentInput[] }

export function resolveMultiBodySendPlan(bodies: readonly MultiBodySegmentInput[]): MultiBodySendPlan {
  if (bodies.length === 0)
    return { kind: 'empty' }
  if (bodies.length > 20)
    return { kind: 'tooMany', count: bodies.length }
  if (bodies.length > 1)
    return { kind: 'multiBody', bodies }

  const body = bodies[0]!
  switch (body.type) {
    case MESSAGE_TYPE.TEXT:
      return { kind: 'text', body: body as TextInput }
    case MESSAGE_TYPE.IMAGE:
      return { kind: 'image', body: body as ImageInput }
    case MESSAGE_TYPE.VIDEO:
      return { kind: 'video', body: body as VideoInput }
    case MESSAGE_TYPE.FILE:
      return { kind: 'file', body: body as FileInput }
    default:
      throw new Error('MULTI_BODY_UNSUPPORTED_SINGLE_SEGMENT')
  }
}

export async function settleInputDraftSend(
  send: () => Promise<boolean>,
  clearDraft: () => void,
  canClearDraft: () => boolean = () => true,
): Promise<boolean> {
  const succeeded = await send()
  if (succeeded && canClearDraft())
    clearDraft()
  return succeeded
}
