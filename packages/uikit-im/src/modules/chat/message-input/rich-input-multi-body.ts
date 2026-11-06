import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'

export interface RichDocumentNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: RichDocumentNode[]
}

/** 将 Tiptap JSON 按 inline 顺序投影为中立分段，保留原始 File 引用。 */
export function projectRichDocumentToMultiBodyInputs(
  document: RichDocumentNode,
  fileMap: ReadonlyMap<string, File | MultiBodySegmentInput>,
  attachments: readonly MultiBodySegmentInput[] = [],
  attachmentMap: ReadonlyMap<string, MultiBodySegmentInput> = new Map(),
): MultiBodySegmentInput[] {
  const bodies: MultiBodySegmentInput[] = []
  let textBuffer = ''

  function flushText() {
    const content = textBuffer.trim()
    if (content)
      bodies.push({ type: 'text', content })
    textBuffer = ''
  }

  function appendImage(node: RichDocumentNode) {
    const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
    const source = fileMap.get(src)
    if (!source)
      throw new Error('MULTI_BODY_IMAGE_FILE_MISSING')
    flushText()
    if (source instanceof File) {
      bodies.push({
        type: 'image',
        data: source,
        filename: source.name,
        filetype: source.type,
      })
      return
    }
    if (source.type !== 'image')
      throw new Error('MULTI_BODY_IMAGE_FILE_MISSING')
    bodies.push(source)
  }

  function appendAttachment(node: RichDocumentNode) {
    const id = typeof node.attrs?.attachmentId === 'string' ? node.attrs.attachmentId : ''
    const attachment = attachmentMap.get(id)
    if (!attachment)
      throw new Error('MULTI_BODY_ATTACHMENT_FILE_MISSING')
    flushText()
    bodies.push(attachment)
  }

  function visitInline(node: RichDocumentNode) {
    if (node.type === 'text') {
      textBuffer += node.text || ''
      return
    }
    if (node.type === 'hardBreak') {
      textBuffer += '\n'
      return
    }
    if (node.type === 'image') {
      appendImage(node)
      return
    }
    if (node.type === 'multiBodyAttachment') {
      appendAttachment(node)
      return
    }
    node.content?.forEach(visitInline)
  }

  const blocks = document.content || []
  blocks.forEach((block, blockIndex) => {
    block.content?.forEach(visitInline)
    if (blockIndex < blocks.length - 1 && textBuffer)
      textBuffer += '\n'
  })
  flushText()
  return [...bodies, ...attachments]
}
