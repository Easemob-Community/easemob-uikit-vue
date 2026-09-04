// message store 热路径与会话级内存淘汰的单元测试
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SdkMessage } from '@easemob/uikit-sdk-contract'
import type { UiMessage } from '@easemob/uikit-core'
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '@easemob/uikit-core'
import { getHistoryCursor, setHistoryCursor } from '../../composables/message-history-cursor'
import { useMessageStore } from '../message'

/** 构造 UI 层消息（默认属于会话 c1） */
function makeMsg(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    msgServerId: '',
    msgLocalId: '',
    from: 'peer',
    to: 'me',
    sender: { userId: 'peer' },
    conversationId: 'c1',
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENT,
    ext: {},
    timestamp: 1000,
    body: { content: 'hi' },
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
    ...overrides,
  } as UiMessage
}

/** 构造发送中的 SDK 消息（addSendingMessage 入参） */
function makeSdkMsg(msgLocalId: string, timestamp: number, conversationId = 'c1'): SdkMessage {
  return {
    msgServerId: '',
    msgLocalId,
    from: 'me',
    to: 'peer',
    sender: { userId: 'me' },
    conversationId,
    conversationType: CONVERSATION_TYPE.SINGLECHAT,
    type: MESSAGE_TYPE.TEXT,
    sendStatus: MESSAGE_STATUS.SENDING,
    ext: {},
    timestamp,
    body: { content: 'hi' },
  } as SdkMessage
}

function timestamps(list: UiMessage[]): number[] {
  return list.map(m => m.timestamp)
}

describe('message store', () => {
  let store: ReturnType<typeof useMessageStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMessageStore()
  })

  describe('插入排序', () => {
    it('顺序追加：直接尾部拼接，保持升序', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 1000 }))
      store.addMessage(makeMsg({ msgServerId: 's2', timestamp: 2000 }))
      store.addMessage(makeMsg({ msgServerId: 's3', timestamp: 3000 }))
      expect(timestamps(store.getMessages('c1'))).toEqual([1000, 2000, 3000])
    })

    it('乱序插入：二分定位到正确位置', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 1000 }))
      store.addMessage(makeMsg({ msgServerId: 's3', timestamp: 3000 }))
      store.addMessage(makeMsg({ msgServerId: 's2', timestamp: 2000 }))
      store.addMessage(makeMsg({ msgServerId: 's0', timestamp: 500 }))
      expect(store.getMessages('c1').map(m => m.msgServerId)).toEqual(['s0', 's1', 's2', 's3'])
    })

    it('相同 timestamp：插到已有元素之后（与稳定排序语义一致）', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 1000 }))
      store.addMessage(makeMsg({ msgServerId: 's2', timestamp: 1000 }))
      expect(store.getMessages('c1').map(m => m.msgServerId)).toEqual(['s1', 's2'])
    })

    it('重复消息跳过：msgServerId / msgLocalId 命中均不重复插入', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', msgLocalId: 'l1', timestamp: 1000 }))
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 2000 }))
      store.addMessage(makeMsg({ msgServerId: 's9', msgLocalId: 'l1', timestamp: 3000 }))
      expect(store.getMessages('c1')).toHaveLength(1)
    })

    it('addSendingMessage：有序插入且状态为 sending', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 2000 }))
      store.addSendingMessage('loc-a', makeSdkMsg('loc-a', 1000))
      const list = store.getMessages('c1')
      expect(timestamps(list)).toEqual([1000, 2000])
      expect(list[0].status).toBe(MESSAGE_STATUS.SENDING)
      expect(list[0].localId).toBe('loc-a')
    })

    it('addSendingMessage 重复 localId 跳过', () => {
      store.addSendingMessage('loc-a', makeSdkMsg('loc-a', 1000))
      store.addSendingMessage('loc-a', makeSdkMsg('loc-a', 2000))
      expect(store.getMessages('c1')).toHaveLength(1)
    })

    it('prependMessages：批量插入头部、去重并保持升序', () => {
      store.addMessage(makeMsg({ msgServerId: 's3', timestamp: 3000 }))
      store.prependMessages('c1', [
        makeMsg({ msgServerId: 's1', timestamp: 1000 }),
        makeMsg({ msgServerId: 's2', timestamp: 2000 }),
        // 与已有消息重复，应被过滤
        makeMsg({ msgServerId: 's3', timestamp: 3000 }),
      ])
      expect(store.getMessages('c1').map(m => m.msgServerId)).toEqual(['s1', 's2', 's3'])
    })
  })

  describe('消息 ID 索引', () => {
    it('索引命中：按 msgLocalId 更新状态', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', msgLocalId: 'l1', timestamp: 1000 }))
      store.updateMessageStatus('l1', MESSAGE_STATUS.READ)
      expect(store.getMessages('c1')[0].status).toBe(MESSAGE_STATUS.READ)
    })

    it('trim 裁掉的消息同步删索引：裁剪后按旧 ID 更新为 no-op', () => {
      store.setOptions({ maxMessageCount: 3 })
      for (let i = 1; i <= 4; i++)
        store.addMessage(makeMsg({ msgServerId: `s${i}`, timestamp: i * 1000 }))
      const list = store.getMessages('c1')
      expect(list.map(m => m.msgServerId)).toEqual(['s2', 's3', 's4'])
      // 被裁掉的 s1：更新不应生效（索引已随 trim 删除，且消息已不在列表）
      store.updateMessageById('s1', { recalled: true })
      expect(store.getMessages('c1').some(m => m.msgServerId === 's1')).toBe(false)
      // 保留的 s2：索引仍有效
      store.updateMessageById('s2', { recalled: true })
      expect(store.getMessages('c1')[0].recalled).toBe(true)
    })

    it('prependMessages 触发 trim 时被裁掉的新消息不登记索引', () => {
      store.setOptions({ maxMessageCount: 2 })
      store.addMessage(makeMsg({ msgServerId: 's3', timestamp: 3000 }))
      store.prependMessages('c1', [
        makeMsg({ msgServerId: 's1', timestamp: 1000 }),
        makeMsg({ msgServerId: 's2', timestamp: 2000 }),
      ])
      expect(store.getMessages('c1').map(m => m.msgServerId)).toEqual(['s2', 's3'])
    })

    it('调大 maxMessageCount 后连续 prepend 多页旧消息全部保留（Electron 持久化翻页回归）', () => {
      // 回归场景：单会话灌大量历史后上拉翻页，默认上限 300 会把刚加载的最旧页立即裁掉；
      // Provider maxMessageCount prop 调高后（如 Electron 验证工程 10000），多页旧历史应全部可见
      store.setOptions({ maxMessageCount: 2000 })
      // 初始最新一页
      store.prependMessages('c1', Array.from({ length: 300 }, (_, i) =>
        makeMsg({ msgServerId: `s-p0-${i}`, timestamp: 1500000 + i * 1000 })))
      // 连续上拉加载 5 页更旧历史（每页 300 条，时间戳递减）
      for (let page = 1; page <= 5; page++) {
        store.prependMessages('c1', Array.from({ length: 300 }, (_, i) =>
          makeMsg({ msgServerId: `s-p${page}-${i}`, timestamp: 1500000 - page * 300000 + i * 1000 })))
      }
      const list = store.getMessages('c1')
      expect(list).toHaveLength(1800)
      // 最旧一页的首条仍在（未被 trim 裁掉），整体升序
      expect(list[0].msgServerId).toBe('s-p5-0')
      expect(list[list.length - 1].msgServerId).toBe('s-p0-299')
    })

    it('deleteMessage 删除后同步删索引：再次更新为 no-op', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', msgLocalId: 'l1', timestamp: 1000 }))
      store.deleteMessage('l1')
      expect(store.getMessages('c1')).toHaveLength(0)
      store.updateMessageById('l1', { recalled: true })
      expect(store.getMessages('c1')).toHaveLength(0)
    })

    it('deleteMessages 批量删除并同步删索引', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 1000 }))
      store.addMessage(makeMsg({ msgServerId: 's2', timestamp: 2000, conversationId: 'c2' }))
      store.deleteMessages(['s1', 's2'])
      expect(store.getMessages('c1')).toHaveLength(0)
      expect(store.getMessages('c2')).toHaveLength(0)
    })

    it('跨会话 ID 冲突时回退全表扫描：索引未命中仍能定位', () => {
      // 两个会话各有一条 msgServerId 相同的消息（索引只保留最后登记的一条）
      store.addMessage(makeMsg({ msgServerId: 'dup', timestamp: 1000, conversationId: 'c1' }))
      store.addMessage(makeMsg({ msgServerId: 'dup', timestamp: 1000, conversationId: 'c2' }))
      // 第一次删除走索引命中 c2
      store.deleteMessage('dup')
      expect(store.getMessages('c2')).toHaveLength(0)
      expect(store.getMessages('c1')).toHaveLength(1)
      // 第二次删除索引未命中，回退全表扫描命中 c1 并补登索引
      store.deleteMessage('dup')
      expect(store.getMessages('c1')).toHaveLength(0)
    })

    it('replaceWithSent：localId 键保留、新 serverId 补登', () => {
      store.addSendingMessage('loc-a', makeSdkMsg('loc-a', 1000))
      store.replaceWithSent('loc-a', makeMsg({
        msgServerId: 'srv-a',
        msgLocalId: 'loc-a',
        timestamp: 1000,
      }))
      const list = store.getMessages('c1')
      expect(list).toHaveLength(1)
      expect(list[0].msgServerId).toBe('srv-a')
      expect(list[0].localId).toBe('loc-a')
      // localId 与新 serverId 均可定位
      store.updateMessageById('loc-a', { recalled: true })
      expect(store.getMessages('c1')[0].recalled).toBe(true)
      store.updateMessageStatus('srv-a', MESSAGE_STATUS.DELIVERED)
      expect(store.getMessages('c1')[0].status).toBe(MESSAGE_STATUS.DELIVERED)
    })

    it('clearConversationMessages 同步删索引', () => {
      store.addMessage(makeMsg({ msgServerId: 's1', timestamp: 1000 }))
      store.clearConversationMessages('c1')
      store.updateMessageById('s1', { recalled: true })
      expect(store.getMessages('c1')).toHaveLength(0)
    })
  })

  describe('会话级内存淘汰（opt-in）', () => {
    it('默认不配置 maxCachedConversations：不淘汰', () => {
      for (let i = 1; i <= 5; i++)
        store.addMessage(makeMsg({ msgServerId: `s${i}`, conversationId: `c${i}` }))
      for (let i = 1; i <= 5; i++)
        expect(store.getMessages(`c${i}`)).toHaveLength(1)
    })

    it('超限后从最旧会话开始淘汰，并清理关联缓存与翻页游标', () => {
      store.setOptions({ maxCachedConversations: 2 })
      store.addMessage(makeMsg({ msgServerId: 's1', conversationId: 'c1' }))
      store.setPinnedMessages('c1', [makeMsg({ msgServerId: 's1', conversationId: 'c1' })])
      store.addAtMeMessage('c1', 's1')
      setHistoryCursor('c1', 'cursor-1', false)
      store.addMessage(makeMsg({ msgServerId: 's2', conversationId: 'c2' }))
      // 未超限时无淘汰
      expect(store.getMessages('c1')).toHaveLength(1)
      // 第三个会话触发淘汰：最旧的 c1 被淘汰
      store.addMessage(makeMsg({ msgServerId: 's3', conversationId: 'c3' }))
      expect(store.getMessages('c1')).toHaveLength(0)
      expect(store.getPinnedMessages('c1')).toHaveLength(0)
      expect(store.getAtMeMessages('c1')).toHaveLength(0)
      expect(getHistoryCursor('c1')).toEqual({ cursor: '', isLast: false })
      expect(store.getMessages('c2')).toHaveLength(1)
      expect(store.getMessages('c3')).toHaveLength(1)
    })

    it('淘汰跳过最近一次 touch 的会话（保护当前正在查看的会话）', () => {
      store.setOptions({ maxCachedConversations: 2 })
      store.addMessage(makeMsg({ msgServerId: 's1', conversationId: 'c1' }))
      store.addMessage(makeMsg({ msgServerId: 's2', conversationId: 'c2' }))
      // 切回 c1 查看：c1 成为最近一次 touch
      store.touchConversation('c1')
      // 新会话 c3 触发淘汰：最旧的 c2 被淘汰，正在查看的 c1 保留
      store.addMessage(makeMsg({ msgServerId: 's3', conversationId: 'c3' }))
      expect(store.getMessages('c1')).toHaveLength(1)
      expect(store.getMessages('c2')).toHaveLength(0)
      expect(store.getMessages('c3')).toHaveLength(1)
    })

    it('淘汰清理发送中消息缓存（sendingMetaMap）', () => {
      store.setOptions({ maxCachedConversations: 1 })
      store.addSendingMessage('loc-a', makeSdkMsg('loc-a', 1000, 'c1'))
      expect(Object.keys(store.sendingMetaMap)).toContain('loc-a')
      store.addMessage(makeMsg({ msgServerId: 's2', conversationId: 'c2' }))
      expect(store.getMessages('c1')).toHaveLength(0)
      expect(Object.keys(store.sendingMetaMap)).not.toContain('loc-a')
    })

    it('prependMessages / addSendingMessage 内部自动 touch', () => {
      store.setOptions({ maxCachedConversations: 2 })
      store.addMessage(makeMsg({ msgServerId: 's1', conversationId: 'c1' }))
      store.addMessage(makeMsg({ msgServerId: 's2', conversationId: 'c2' }))
      // c1 有历史拉取活动 → 移到最新，c2 变为最旧
      store.prependMessages('c1', [makeMsg({ msgServerId: 's0', conversationId: 'c1', timestamp: 500 })])
      store.addMessage(makeMsg({ msgServerId: 's3', conversationId: 'c3' }))
      expect(store.getMessages('c1')).toHaveLength(2)
      expect(store.getMessages('c2')).toHaveLength(0)
      expect(store.getMessages('c3')).toHaveLength(1)
    })

    it('clearConversationMessages / clearMessages 同步维护 LRU 结构', () => {
      store.setOptions({ maxCachedConversations: 2 })
      store.addMessage(makeMsg({ msgServerId: 's1', conversationId: 'c1' }))
      store.addMessage(makeMsg({ msgServerId: 's2', conversationId: 'c2' }))
      // 手动清空 c1 后，c3/c4 进入不应再触发额外淘汰（LRU 已移除 c1）
      store.clearConversationMessages('c1')
      store.addMessage(makeMsg({ msgServerId: 's3', conversationId: 'c3' }))
      expect(store.getMessages('c2')).toHaveLength(1)
      expect(store.getMessages('c3')).toHaveLength(1)
      // clearMessages 全量重置：LRU 与索引一并清空
      store.clearMessages()
      expect(store.getMessages('c2')).toHaveLength(0)
      store.addMessage(makeMsg({ msgServerId: 's4', conversationId: 'c4' }))
      store.addMessage(makeMsg({ msgServerId: 's5', conversationId: 'c5' }))
      expect(store.getMessages('c4')).toHaveLength(1)
      expect(store.getMessages('c5')).toHaveLength(1)
    })
  })
})
