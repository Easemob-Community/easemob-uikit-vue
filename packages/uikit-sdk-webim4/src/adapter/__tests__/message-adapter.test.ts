import type { EasemobChat } from 'easemob-websdk'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SdkMessage } from '@easemob/uikit-sdk-contract'
import {
  MESSAGE_TYPE,
  STREAM_MESSAGE_STATUS,
  isCmdBody,
  isCombineBody,
  isCustomBody,
  isFileBody,
  isImageBody,
  isLocationBody,
  isTextBody,
  isVideoBody,
  isVoiceBody,
} from '@easemob/uikit-sdk-contract'
import {
  resetStreamState,
  toUiMessage,
  toWebim4MessageBody,
} from '../message-adapter'

const SELF = 'me'
const PEER = 'peer1'
const GROUP = 'group1'

/** 构造 4.x 文本消息体 */
function makeText(overrides: Partial<EasemobChat.TextMsgBody> = {}): EasemobChat.TextMsgBody {
  return {
    id: 'srv-1',
    chatType: 'singleChat',
    type: 'txt',
    to: PEER,
    from: SELF,
    msg: 'hello',
    time: 1700000000000,
    ...overrides,
  }
}

describe('toUiMessage 顶层字段映射', () => {
  it('id/time/chatType/isRead/isDelivered → msgServerId/timestamp/conversationType/isPeerRead/isPeerDelivered', () => {
    const ui = toUiMessage(makeText({ isRead: true, isDelivered: true }), SELF)
    expect(ui.msgServerId).toBe('srv-1')
    expect(ui.timestamp).toBe(1700000000000)
    expect(ui.conversationType).toBe('singleChat')
    expect(ui.isPeerRead).toBe(true)
    expect(ui.isPeerDelivered).toBe(true)
    expect(ui.type).toBe(MESSAGE_TYPE.TEXT)
    // 自己发送且对端已读 → UI 状态直接为 read
    expect(ui.status).toBe('read')
    expect(ui.isSelf).toBe(true)
  })

  it('群聊 conversationId 取 to（群 ID），conversationType 为 groupChat', () => {
    const ui = toUiMessage(makeText({ chatType: 'groupChat', to: GROUP, from: PEER }), SELF)
    expect(ui.conversationId).toBe(GROUP)
    expect(ui.conversationType).toBe('groupChat')
    expect(ui.isSelf).toBe(false)
    // 接收方向消息状态视为 sent
    expect(ui.status).toBe('sent')
  })

  it('单聊 conversationId 取对端：自己发取 to，对方发取 from', () => {
    expect(toUiMessage(makeText({ from: SELF, to: PEER }), SELF).conversationId).toBe(PEER)
    expect(toUiMessage(makeText({ from: PEER, to: SELF }), SELF).conversationId).toBe(PEER)
  })

  it('needReadReceipt 由 msgConfig.allowGroupAck 映射', () => {
    const withAck = toUiMessage(makeText({ msgConfig: { allowGroupAck: true } }), SELF)
    expect(withAck.needReadReceipt).toBe(true)
    expect(toUiMessage(makeText(), SELF).needReadReceipt).toBeUndefined()
  })

  it('sender 由 from 合成；ext 兜底空对象', () => {
    const ui = toUiMessage(makeText(), SELF)
    expect(ui.sender).toEqual({ userId: SELF })
    expect(ui.ext).toEqual({})
  })
})

describe('mapBody 字段映射 + 结构型守卫判别（主计划风险 #8）', () => {
  it('txt → text：msg→content，不残留 msg 字段', () => {
    const { body } = toUiMessage(makeText(), SELF)
    expect(isTextBody(body)).toBe(true)
    if (!isTextBody(body))
      return
    expect(body.content).toBe('hello')
    expect('msg' in body).toBe(false)
    // 其它类型守卫全部不误判
    expect(isImageBody(body)).toBe(false)
    expect(isVoiceBody(body)).toBe(false)
    expect(isVideoBody(body)).toBe(false)
    expect(isFileBody(body)).toBe(false)
    expect(isLocationBody(body)).toBe(false)
    expect(isCustomBody(body)).toBe(false)
    expect(isCmdBody(body)).toBe(false)
    expect(isCombineBody(body)).toBe(false)
  })

  it('txt 携带 translations 时映射为 Record<语言, 译文>', () => {
    const msg = makeText({
      translations: {
        translations: [{ text: '你好', to: 'zh-Hans' }],
        detectedLanguage: { language: 'en', score: 0.9 },
      },
    })
    const { body } = toUiMessage(msg, SELF)
    if (!isTextBody(body))
      throw new Error('should be text body')
    expect(body.translations).toEqual({ 'zh-Hans': '你好' })
  })

  it('img → image：thumb→thumbnailUrl、file_length→fileLength，不残留 thumb/url/file_length', () => {
    const msg: EasemobChat.ImgMsgBody = {
      id: 'srv-img',
      chatType: 'groupChat',
      type: 'img',
      to: GROUP,
      from: PEER,
      time: 1700000000001,
      url: 'https://cdn/img.png',
      thumb: 'https://cdn/img-thumb.png',
      secret: 'sec',
      file_length: 1024,
      width: 200,
      height: 100,
      isOriginalImage: true,
      originalImageUrl: 'https://cdn/img-origin.png',
      bigImageUrl: 'https://cdn/img-big.png',
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.IMAGE)
    expect(isImageBody(body)).toBe(true)
    if (!isImageBody(body))
      return
    expect(body.thumbnailUrl).toBe('https://cdn/img-thumb.png')
    expect(body.originalImageUrl).toBe('https://cdn/img-origin.png')
    expect(body.bigImageUrl).toBe('https://cdn/img-big.png')
    expect(body.fileLength).toBe(1024)
    expect(body.width).toBe(200)
    expect(body.height).toBe(100)
    expect(body.isOriginalImage).toBe(true)
    expect(body.secret).toBe('sec')
    // 风险 #8：4.x 原始字段不得残留（url 同时存在会误导 isFileBody 等守卫）
    expect('thumb' in body).toBe(false)
    expect('url' in body).toBe(false)
    expect('file_length' in body).toBe(false)
    expect(isFileBody(body)).toBe(false)
    expect(isVideoBody(body)).toBe(false)
  })

  it('audio → voice：length→duration，不残留 length 字段；不误判为 video', () => {
    const msg: EasemobChat.AudioMsgBody = {
      id: 'srv-audio',
      chatType: 'singleChat',
      type: 'audio',
      to: SELF,
      from: PEER,
      time: 1700000000002,
      url: 'https://cdn/a.amr',
      filename: 'a.amr',
      length: 3,
      file_length: 2048,
      secret: 'sec-a',
      file: { url: '', filename: 'a.amr', filetype: 'audio/amr', data: undefined as unknown as File },
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.VOICE)
    expect(isVoiceBody(body)).toBe(true)
    if (!isVoiceBody(body))
      return
    expect(body.duration).toBe(3)
    expect(body.url).toBe('https://cdn/a.amr')
    expect(body.filename).toBe('a.amr')
    expect(body.fileLength).toBe(2048)
    expect('length' in body).toBe(false)
    expect('file' in body).toBe(false)
    // voice 守卫要求无 thumbnailUrl/width；file 守卫要求无 duration
    expect(isVideoBody(body)).toBe(false)
    expect(isFileBody(body)).toBe(false)
  })

  it('video → video：thumb→thumbnailUrl + duration 共存，守卫判为 video 而非 voice', () => {
    const msg: EasemobChat.VideoMsgBody = {
      id: 'srv-video',
      chatType: 'singleChat',
      type: 'video',
      to: SELF,
      from: PEER,
      time: 1700000000003,
      url: 'https://cdn/v.mp4',
      thumb: 'https://cdn/v-thumb.jpg',
      filename: 'v.mp4',
      length: 12,
      file_length: 4096,
      secret: 'sec-v',
      file: { url: '', filename: 'v.mp4', filetype: 'video/mp4', data: undefined as unknown as File },
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.VIDEO)
    expect(isVideoBody(body)).toBe(true)
    if (!isVideoBody(body))
      return
    expect(body.duration).toBe(12)
    expect(body.thumbnailUrl).toBe('https://cdn/v-thumb.jpg')
    expect('thumb' in body).toBe(false)
    expect('length' in body).toBe(false)
    expect(isVoiceBody(body)).toBe(false)
  })

  it('file → file：file_length→fileSize/fileLength，不误判为 voice/video', () => {
    const msg: EasemobChat.FileMsgBody = {
      id: 'srv-file',
      chatType: 'singleChat',
      type: 'file',
      to: SELF,
      from: PEER,
      time: 1700000000004,
      url: 'https://cdn/f.zip',
      filename: 'f.zip',
      file_length: 8192,
      secret: 'sec-f',
      file: { url: '', filename: 'f.zip', filetype: 'application/zip', data: undefined as unknown as File },
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.FILE)
    expect(isFileBody(body)).toBe(true)
    if (!isFileBody(body))
      return
    expect(body.fileSize).toBe(8192)
    expect(body.fileLength).toBe(8192)
    expect(body.filename).toBe('f.zip')
    expect('file_length' in body).toBe(false)
    expect(isVoiceBody(body)).toBe(false)
    expect(isVideoBody(body)).toBe(false)
  })

  it('loc → location：addr/lat/lng→address/latitude/longitude，不残留原始字段', () => {
    const msg: EasemobChat.LocationMsgBody = {
      id: 'srv-loc',
      chatType: 'singleChat',
      type: 'loc',
      to: SELF,
      from: PEER,
      time: 1700000000005,
      addr: '上海市徐汇区',
      buildingName: '某大厦',
      lat: 31.18,
      lng: 121.43,
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.LOCATION)
    expect(isLocationBody(body)).toBe(true)
    if (!isLocationBody(body))
      return
    expect(body.address).toBe('上海市徐汇区')
    expect(body.buildingName).toBe('某大厦')
    expect(body.latitude).toBe(31.18)
    expect(body.longitude).toBe(121.43)
    expect('addr' in body).toBe(false)
    expect('lat' in body).toBe(false)
    expect('lng' in body).toBe(false)
  })

  it('custom → custom：customEvent/customExts→event/params，不残留原始字段', () => {
    const msg: EasemobChat.CustomMsgBody = {
      id: 'srv-custom',
      chatType: 'singleChat',
      type: 'custom',
      to: SELF,
      from: PEER,
      time: 1700000000006,
      customEvent: 'userCard',
      customExts: { uid: 'u1' },
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.CUSTOM)
    expect(isCustomBody(body)).toBe(true)
    if (!isCustomBody(body))
      return
    expect(body.event).toBe('userCard')
    expect(body.params).toEqual({ uid: 'u1' })
    expect('customEvent' in body).toBe(false)
    expect('customExts' in body).toBe(false)
  })

  it('cmd → cmd：action 透传', () => {
    const msg: EasemobChat.CmdMsgBody = {
      id: 'srv-cmd',
      chatType: 'singleChat',
      type: 'cmd',
      to: SELF,
      from: PEER,
      time: 1700000000007,
      action: 'TypingBegin',
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.CMD)
    expect(isCmdBody(body)).toBe(true)
    if (!isCmdBody(body))
      return
    expect(body.action).toBe('TypingBegin')
  })

  it('combine → combine：title/summary/url/secret/combineLevel 同名映射，fileLength 映射', () => {
    const msg: EasemobChat.CombineMsgBody = {
      id: 'srv-combine',
      chatType: 'singleChat',
      type: 'combine',
      to: SELF,
      from: PEER,
      time: 1700000000008,
      title: '聊天记录',
      summary: 'A: 你好',
      compatibleText: '版本过低',
      combineLevel: 1,
      url: 'https://cdn/combine.zip',
      secret: 'sec-c',
      filename: 'combine.zip',
      file_length: 10240,
    }
    const { body, type } = toUiMessage(msg, SELF)
    expect(type).toBe(MESSAGE_TYPE.COMBINE)
    expect(isCombineBody(body)).toBe(true)
    if (!isCombineBody(body))
      return
    expect(body.title).toBe('聊天记录')
    expect(body.summary).toBe('A: 你好')
    expect(body.url).toBe('https://cdn/combine.zip')
    expect(body.secret).toBe('sec-c')
    expect(body.filename).toBe('combine.zip')
    expect(body.fileLength).toBe(10240)
    expect(body.combineLevel).toBe(1)
    expect('file_length' in body).toBe(false)
    expect('compatibleText' in body).toBe(false)
  })
})

describe('流式消息映射（SDK msg 累计全量优先，stream.text 增量兜底）', () => {
  beforeEach(() => {
    resetStreamState()
  })

  function makeStream(
    status: number,
    text: string,
    overrides: Partial<EasemobChat.StreamMsgBody> = {},
  ): EasemobChat.StreamMsgBody {
    return {
      ...makeText({ id: 'srv-stream' }),
      // 默认置空 msg，走 adapter 自累计兜底路径；SDK 真实回调的 msg 为累计全量（单独用例覆盖）
      msg: '',
      stream: { customType: 'text', status: status as EasemobChat.StreamStatus, errorType: 0, text },
      ...overrides,
    } as EasemobChat.StreamMsgBody
  }

  it('数字 status → 中立字符串状态；增量累计为 fullText 并覆盖 body.content', () => {
    const first = toUiMessage(makeStream(0, '你'), SELF)
    expect(first.stream?.status).toBe(STREAM_MESSAGE_STATUS.START)
    expect(first.stream?.deltaText).toBe('你')
    expect(first.stream?.fullText).toBe('你')
    expect(first.stream?.seq).toBe(1)
    if (!isTextBody(first.body))
      throw new Error('stream body should be text')
    expect(first.body.content).toBe('你')

    const second = toUiMessage(makeStream(2, '好'), SELF)
    expect(second.stream?.status).toBe(STREAM_MESSAGE_STATUS.IN_PROGRESS)
    expect(second.stream?.deltaText).toBe('好')
    expect(second.stream?.fullText).toBe('你好')
    expect(second.stream?.seq).toBe(2)

    const done = toUiMessage(makeStream(3, '！'), SELF)
    expect(done.stream?.status).toBe(STREAM_MESSAGE_STATUS.COMPLETED)
    expect(done.stream?.fullText).toBe('你好！')
    if (!isTextBody(done.body))
      throw new Error('stream body should be text')
    expect(done.body.content).toBe('你好！')
  })

  it('单分片完成（1）与异常（4）映射为 START_COMPLETED / ERROR', () => {
    expect(toUiMessage(makeStream(1, '全文'), SELF).stream?.status).toBe(STREAM_MESSAGE_STATUS.START_COMPLETED)
    resetStreamState()
    expect(toUiMessage(makeStream(4, ''), SELF).stream?.status).toBe(STREAM_MESSAGE_STATUS.ERROR)
  })

  it('终态后清理累计状态：同 ID 新流从 seq 1 重新累计', () => {
    toUiMessage(makeStream(1, '完成'), SELF)
    const next = toUiMessage(makeStream(0, '新'), SELF)
    expect(next.stream?.seq).toBe(1)
    expect(next.stream?.fullText).toBe('新')
  })

  it('优先采用 SDK 回调 msg（累计全量）：首片丢失后由 msg 回填全量', () => {
    // 模拟首片（'你'）丢失：增量只有 '好'，但 SDK 回调 msg 已是合并全量 '你好'
    const ui = toUiMessage(makeStream(2, '好', { msg: '你好' }), SELF)
    expect(ui.stream?.status).toBe(STREAM_MESSAGE_STATUS.IN_PROGRESS)
    expect(ui.stream?.deltaText).toBe('好')
    expect(ui.stream?.fullText).toBe('你好')
    if (!isTextBody(ui.body))
      throw new Error('stream body should be text')
    expect(ui.body.content).toBe('你好')
  })
})

describe('toWebim4MessageBody 反向映射（合并转发子消息）', () => {
  it('text/image/location 关键字段回转正确', () => {
    const textMsg = toUiMessage(makeText(), SELF) as SdkMessage
    const back = toWebim4MessageBody(textMsg)
    expect(back?.type).toBe('txt')
    expect((back as EasemobChat.TextMsgBody).msg).toBe('hello')
    expect(back?.id).toBe('srv-1')

    const imgMsg = toUiMessage({
      id: 'srv-img',
      chatType: 'groupChat',
      type: 'img',
      to: GROUP,
      from: PEER,
      time: 1,
      thumb: 'https://cdn/t.png',
      file_length: 10,
    } as EasemobChat.ImgMsgBody, SELF) as SdkMessage
    const imgBack = toWebim4MessageBody(imgMsg) as EasemobChat.ImgMsgBody
    expect(imgBack.type).toBe('img')
    expect(imgBack.thumb).toBe('https://cdn/t.png')
    expect(imgBack.file_length).toBe(10)

    const locBack = toWebim4MessageBody(toUiMessage({
      id: 'srv-loc',
      chatType: 'singleChat',
      type: 'loc',
      to: SELF,
      from: PEER,
      time: 1,
      addr: '地址',
      buildingName: '',
      lat: 1,
      lng: 2,
    } as EasemobChat.LocationMsgBody, SELF) as SdkMessage) as EasemobChat.LocationMsgBody
    expect(locBack.type).toBe('loc')
    expect(locBack.addr).toBe('地址')
    expect(locBack.lat).toBe(1)
    expect(locBack.lng).toBe(2)
  })

  it('cmd 类型返回 null（不支持合并转发）', () => {
    const cmdMsg = toUiMessage({
      id: 'srv-cmd',
      chatType: 'singleChat',
      type: 'cmd',
      to: SELF,
      from: PEER,
      time: 1,
      action: 'TypingBegin',
    } as EasemobChat.CmdMsgBody, SELF) as SdkMessage
    expect(toWebim4MessageBody(cmdMsg)).toBeNull()
  })
})
