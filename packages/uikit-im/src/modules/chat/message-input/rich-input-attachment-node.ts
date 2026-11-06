import { Node, VueNodeViewRenderer, mergeAttributes } from '@tiptap/vue-3'
import RichInputAttachmentNodeView from './components/rich-input-attachment-node-view.vue'

export const MULTI_BODY_ATTACHMENT_NODE = 'multiBodyAttachment'

export const MultiBodyAttachmentNode = Node.create({
  name: MULTI_BODY_ATTACHMENT_NODE,
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addOptions() {
    return {
      isSending: () => false,
    }
  },

  addAttributes() {
    return {
      attachmentId: {
        default: '',
        parseHTML: element => element.getAttribute('data-attachment-id') || '',
      },
      attachmentType: {
        default: 'file',
        parseHTML: element => element.getAttribute('data-attachment-type') || 'file',
      },
      fileName: {
        default: '',
        parseHTML: element => element.getAttribute('data-file-name') || '',
      },
      fileSize: {
        default: 0,
        parseHTML: element => Number(element.getAttribute('data-file-size')) || 0,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-rich-input-attachment]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-rich-input-attachment': '',
        'data-attachment-id': node.attrs.attachmentId,
        'data-attachment-type': node.attrs.attachmentType,
        'data-file-name': node.attrs.fileName,
        'data-file-size': node.attrs.fileSize,
        'contenteditable': 'false',
      }),
      node.attrs.fileName,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(RichInputAttachmentNodeView)
  },
})
