import { describe, expect, it } from 'vitest'
import type { MessageBody, SdkMessage } from '../../types/message/body'
import type { UiConversation } from '../../types/conversation'
import { toConversationRecord, toMessageRecord } from '../record'

/** 构造最小中立消息 */
function makeMsg(overrides: Partial<SdkMessage> = {}): SdkMessage {
  return {
    msgServerId: 'srv-1',
    msgLocalId: 'local-1',
    from: 'me',
    to: 'peer1',
    sender: { userId: 'me' },
    conversationId: 'peer1',
    conversationType: 'singleChat',
    type: 'text',
    sendStatus: 'sent',
    ext: {},
    timestamp: 1700000000000,
    body: { content: 'hello' },
    ...overrides,
  }
}

describe('toMessageRecord', () => {
  it('剥离 body 中的 Blob / 函数值（发送中附件场景）', () => {
    const body = {
      url: 'https://cdn/x.png',
      filename: 'x.png',
      file: new Blob(['binary']),
      onProgress: () => {},
    } as unknown as MessageBody
    const record = toMessageRecord(makeMsg({ type: 'image', body }))
    const cleaned = record.body as Record<string, unknown>
    expect(cleaned.url).toBe('https://cdn/x.png')
    expect(cleaned.filename).toBe('x.png')
    expect('file' in cleaned).toBe(false)
    expect('onProgress' in cleaned).toBe(false)
  })

  it('combine 消息 messageList 子消息递归清洗', () => {
    const child = makeMsg({
      msgServerId: 'srv-child',
      body: { url: 'https://cdn/a.pdf', file: new Blob(['x']) } as unknown as MessageBody,
    })
    const record = toMessageRecord(makeMsg({
      type: 'combine',
      body: {
        title: 't',
        summary: 's',
        filename: 'f.zip',
        filetype: 'zip',
        combineLevel: 1,
        messageList: [child],
      },
    }))
    const body = record.body as { messageList: Array<Record<string, unknown>> }
    expect(body.messageList).toHaveLength(1)
    const childBody = body.messageList[0].body as Record<string, unknown>
    expect(childBody.url).toBe('https://cdn/a.pdf')
    expect('file' in childBody).toBe(false)
  })

  it('ext 循环引用置 [Circular]', () => {
    const loop: Record<string, unknown> = { name: 'loop' }
    loop.self = loop
    const record = toMessageRecord(makeMsg({ ext: { loop } }))
    const cleaned = record.ext.loop as Record<string, unknown>
    expect(cleaned.self).toBe('[Circular]')
  })

  it('ext 深拷贝限深 5，超深层级置 [Deep]', () => {
    const ext = { a: { b: { c: { d: { e: { f: 'x' } } } } } }
    const record = toMessageRecord(makeMsg({ ext }))
    const a = record.ext.a as Record<string, any>
    expect(a.b.c.d.e).toBe('[Deep]')
    // 深拷贝：原消息 ext 不被改写
    expect((ext.a.b.c.d.e as any).f).toBe('x')
    expect(record.ext).not.toBe(ext)
  })

  it('墓碑字段（recalled / deleted / tombstoneTime）原样透传', () => {
    const msg = {
      ...makeMsg(),
      recalled: true,
      deleted: true,
      tombstoneTime: 1700000001000,
    } as SdkMessage
    const record = toMessageRecord(msg)
    expect(record.recalled).toBe(true)
    expect(record.deleted).toBe(true)
    expect(record.tombstoneTime).toBe(1700000001000)
  })

  it('顶层函数值防御性剥离', () => {
    const msg = { ...makeMsg(), extraFn: () => {} } as unknown as SdkMessage
    const record = toMessageRecord(msg)
    expect('extraFn' in record).toBe(false)
    expect(record.msgServerId).toBe('srv-1')
  })
})

describe('toConversationRecord', () => {
  it('浅拷贝并剥离函数值，纯数据字段保留', () => {
    const cvs = {
      id: 'peer1',
      name: 'Peer',
      type: 'singleChat',
      unreadCount: 3,
      lastMessageText: 'hi',
      isPinned: false,
      isMuted: false,
      marks: [],
      extraFn: () => {},
    } as unknown as UiConversation
    const record = toConversationRecord(cvs)
    expect(record.id).toBe('peer1')
    expect(record.unreadCount).toBe(3)
    expect('extraFn' in record).toBe(false)
    expect(record).not.toBe(cvs)
  })
})
