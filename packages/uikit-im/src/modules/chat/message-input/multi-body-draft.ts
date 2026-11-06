import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'

export type MultiBodyAttachmentType = typeof MESSAGE_TYPE.IMAGE | typeof MESSAGE_TYPE.VIDEO | typeof MESSAGE_TYPE.FILE

export interface MultiBodyAttachmentDraftItem {
  id: string
  type: MultiBodyAttachmentType
  file: File
  previewUrl: string
  position?: number
  duration?: number
  width?: number
  height?: number
}

let nextDraftId = 0

export function createAttachmentDraft(
  file: File,
  type: MultiBodyAttachmentType,
  metadata: Partial<Pick<MultiBodyAttachmentDraftItem, 'duration' | 'width' | 'height'>> = {},
  position?: number,
): MultiBodyAttachmentDraftItem {
  nextDraftId += 1
  return {
    id: `${type}-${Date.now()}-${nextDraftId}`,
    type,
    file,
    previewUrl: type === MESSAGE_TYPE.FILE ? '' : URL.createObjectURL(file),
    position,
    ...metadata,
  }
}

export function toMultiBodyAttachmentInputs(
  items: readonly MultiBodyAttachmentDraftItem[],
): MultiBodySegmentInput[] {
  return items.map((item) => {
    const base = {
      data: item.file,
      filename: item.file.name,
      filetype: item.file.type,
      fileLength: item.file.size,
      width: item.width,
      height: item.height,
    }
    if (item.type === MESSAGE_TYPE.IMAGE) {
      return { ...base, type: MESSAGE_TYPE.IMAGE }
    }
    if (item.type === MESSAGE_TYPE.VIDEO) {
      return { ...base, type: MESSAGE_TYPE.VIDEO, duration: item.duration ?? 1 }
    }
    return { ...base, type: MESSAGE_TYPE.FILE, fileSize: item.file.size }
  })
}

export function buildMultiBodyInputs(
  text: string,
  items: readonly MultiBodyAttachmentDraftItem[],
): MultiBodySegmentInput[] {
  const bodies: MultiBodySegmentInput[] = []
  const orderedItems = items
    .map((item, index) => ({ item, index, position: item.position ?? text.length }))
    .sort((a, b) => a.position - b.position || a.index - b.index)
  let textOffset = 0

  function appendText(content: string) {
    const trimmed = content.trim()
    if (trimmed)
      bodies.push({ type: MESSAGE_TYPE.TEXT, content: trimmed })
  }

  for (const { item, position } of orderedItems) {
    const anchor = Math.min(text.length, Math.max(textOffset, Math.floor(position)))
    appendText(text.slice(textOffset, anchor))
    bodies.push(...toMultiBodyAttachmentInputs([item]))
    textOffset = anchor
  }
  appendText(text.slice(textOffset))
  return bodies
}

export function rebaseAttachmentPositions(
  items: readonly MultiBodyAttachmentDraftItem[],
  previousText: string,
  nextText: string,
): void {
  if (previousText === nextText)
    return

  let start = 0
  while (start < previousText.length && start < nextText.length && previousText[start] === nextText[start])
    start += 1

  let previousEnd = previousText.length
  let nextEnd = nextText.length
  while (previousEnd > start && nextEnd > start && previousText[previousEnd - 1] === nextText[nextEnd - 1]) {
    previousEnd -= 1
    nextEnd -= 1
  }

  const delta = nextEnd - previousEnd
  for (const item of items) {
    if (item.position === undefined)
      continue
    if (item.position > start)
      item.position = item.position >= previousEnd ? item.position + delta : start
    item.position = Math.min(nextText.length, Math.max(0, item.position))
  }
}

export function resolveSimpleInputHeightChange(
  customHeight: number | null,
  attachmentExtraHeight: number,
  effectiveHeight: number,
): number | null {
  return attachmentExtraHeight > 0 ? effectiveHeight : customHeight
}

export function shouldApplyAttachmentMetadata(
  item: MultiBodyAttachmentDraftItem,
  items: readonly MultiBodyAttachmentDraftItem[],
  generation: number,
  currentGeneration: number,
): boolean {
  return generation === currentGeneration && items.some(candidate => candidate.id === item.id)
}

export function revokeDraftPreviewUrls(items: readonly MultiBodyAttachmentDraftItem[]): void {
  for (const item of items) {
    if (!item.previewUrl.startsWith('blob:'))
      continue
    URL.revokeObjectURL(item.previewUrl)
    item.previewUrl = ''
  }
}
