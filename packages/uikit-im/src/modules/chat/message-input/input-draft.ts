import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'
import type { MentionContact } from '../types'
import type { MultiBodyAttachmentDraftItem } from './multi-body-draft'
import type { RichDocumentNode } from './rich-input-multi-body'

export interface SimpleInputDraftSnapshot {
  mode: 'simple'
  text: string
  attachments: MultiBodyAttachmentDraftItem[]
  mentionList: MentionContact[]
}

export interface RichInputDraftSnapshot {
  mode: 'rich'
  document: RichDocumentNode
  inlineImageFiles: Map<string, File | MultiBodySegmentInput>
  inlineImageBlobUrls: Set<string>
  attachments: MultiBodyAttachmentDraftItem[]
  copiedAttachmentInputs: Map<string, MultiBodySegmentInput>
  mentionList: MentionContact[]
}

export type MessageInputDraftSnapshot = SimpleInputDraftSnapshot | RichInputDraftSnapshot

export interface MessageInputDraft {
  text: string
  preview: string
  snapshot?: MessageInputDraftSnapshot
}

export function resolveMultiBodyDraftPreview(
  bodies: readonly MultiBodySegmentInput[],
  t: (key: string) => string,
): string {
  return bodies.map((segment) => {
    switch (segment.type) {
      case MESSAGE_TYPE.TEXT:
        return segment.content
      case MESSAGE_TYPE.IMAGE:
        return t('message.image')
      case MESSAGE_TYPE.VIDEO:
        return t('message.video')
      case MESSAGE_TYPE.FILE:
        return t('message.file')
      default:
        return ''
    }
  }).join('')
}

export function buildMessageInputDraft(
  text: string,
  snapshot: MessageInputDraftSnapshot | undefined,
  bodies: readonly MultiBodySegmentInput[],
  t: (key: string) => string,
): MessageInputDraft | null {
  const preview = snapshot ? resolveMultiBodyDraftPreview(bodies, t) : text
  if (!text.trim() && !preview.trim())
    return null
  return { text, preview, snapshot }
}

export function canRestoreInputDraftSnapshot<M extends 'simple' | 'rich'>(
  snapshot: MessageInputDraftSnapshot | undefined,
  mode: M,
): snapshot is Extract<MessageInputDraftSnapshot, { mode: M }> {
  return snapshot?.mode === mode
}

function cloneDocument(document: RichDocumentNode): RichDocumentNode {
  return {
    ...document,
    ...(document.attrs ? { attrs: { ...document.attrs } } : {}),
    ...(document.content ? { content: document.content.map(cloneDocument) } : {}),
  }
}

function cloneAttachments(items: readonly MultiBodyAttachmentDraftItem[]): MultiBodyAttachmentDraftItem[] {
  return items.map(item => ({ ...item }))
}

function cloneMentions(items: readonly MentionContact[]): MentionContact[] {
  return items.map(item => ({ ...item }))
}

export function cloneMessageInputDraftSnapshot<T extends MessageInputDraftSnapshot>(snapshot: T): T {
  if (snapshot.mode === 'simple') {
    return {
      ...snapshot,
      attachments: cloneAttachments(snapshot.attachments),
      mentionList: cloneMentions(snapshot.mentionList),
    } as T
  }
  return {
    ...snapshot,
    document: cloneDocument(snapshot.document),
    inlineImageFiles: new Map(snapshot.inlineImageFiles),
    inlineImageBlobUrls: new Set(snapshot.inlineImageBlobUrls),
    attachments: cloneAttachments(snapshot.attachments),
    copiedAttachmentInputs: new Map(snapshot.copiedAttachmentInputs),
    mentionList: cloneMentions(snapshot.mentionList),
  } as T
}

export function getDraftSnapshotPreviewUrls(snapshot: MessageInputDraftSnapshot): string[] {
  const urls = new Set<string>()
  if (snapshot.mode === 'rich') {
    for (const url of snapshot.inlineImageBlobUrls) {
      if (url.startsWith('blob:'))
        urls.add(url)
    }
  }
  for (const item of snapshot.attachments) {
    if (item.previewUrl.startsWith('blob:'))
      urls.add(item.previewUrl)
  }
  return [...urls]
}
