import { describe, expect, it } from 'vitest'
import { CONVERSATION_TYPE } from '@easemob-community/uikit-core'
import type { UiConversation } from '@easemob-community/uikit-core'
import { PRESENCE_SUBSCRIBE_LIMIT, selectPresencePeerIds } from './conversation-list.utils'

function conversation(id: string, type: UiConversation['type']): Pick<UiConversation, 'id' | 'type'> {
  return { id, type }
}

describe('selectPresencePeerIds', () => {
  it('只取单聊、保持顺序并去重', () => {
    const list = [
      conversation('u1', CONVERSATION_TYPE.SINGLECHAT),
      conversation('g1', CONVERSATION_TYPE.GROUPCHAT),
      conversation('u2', CONVERSATION_TYPE.SINGLECHAT),
      conversation('u1', CONVERSATION_TYPE.SINGLECHAT),
      conversation('u3', CONVERSATION_TYPE.SINGLECHAT),
    ]

    expect(selectPresencePeerIds(list)).toEqual(['u1', 'u2', 'u3'])
  })

  it('超过上限时只取前 N 个单聊', () => {
    const list = Array.from({ length: 150 }, (_, index) => conversation(`u${index}`, CONVERSATION_TYPE.SINGLECHAT))
    const ids = selectPresencePeerIds(list)

    expect(ids).toHaveLength(PRESENCE_SUBSCRIBE_LIMIT)
    expect(ids[0]).toBe('u0')
    expect(ids.at(-1)).toBe(`u${PRESENCE_SUBSCRIBE_LIMIT - 1}`)
  })

  it('空列表、limit<=0 与空 id 返回空数组', () => {
    expect(selectPresencePeerIds([])).toEqual([])
    expect(selectPresencePeerIds([conversation('u1', CONVERSATION_TYPE.SINGLECHAT)], 0)).toEqual([])
    expect(selectPresencePeerIds([conversation('', CONVERSATION_TYPE.SINGLECHAT)])).toEqual([])
  })
})
