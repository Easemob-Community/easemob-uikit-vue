import { computed } from 'vue'
import { resolveSdkErrorMessage, t, useCoreUIKit, useToast } from '@easemob/uikit-core'
import type { ChatroomAttrPrefixValue } from '../constants'
import { ChatroomAdapter } from '../sdk/adapter/chatroom-adapter'
import type { ChatroomAttributeMutationResult, ChatroomAttributes } from '../sdk/domain/chatroom-domain'
import { useChatroomStore } from '../store/chatroom'

/**
 * 聊天室房间属性 KV 响应式封装（变种卖点：直播状态/商品 ID/麦位状态等
 * 房间级状态无需自建服务端，见设计文档 5.6）。
 *
 * 四层同步：
 * 1. 本地响应式缓存即时生效（set/remove 先写 store）；
 * 2. `setAttributes`/`removeAttributes` 推送服务端（失败回滚本地缓存）；
 * 3. 实时变更事件同步（onAttributesUpdate/onAttributesRemoved → store，见 chatroom-events）；
 * 4. 全量拉取兜底（进房时 useChatroom 自动 refresh，事件丢失后可手动 refresh）。
 *
 * **属性 key 场景前缀约定**：变种共用房间 KV 命名空间，key 必须加场景前缀
 * （`CHATROOM_ATTR_PREFIX`：live_ / voice_ / class_），用 `prefixedKey` 拼接防冲突。
 */
export function useChatroomAttributes() {
  const ctx = useCoreUIKit()
  const chatroomStore = useChatroomStore()
  const toast = useToast()

  const adapter = new ChatroomAdapter(ctx.client.value)

  const attributes = computed(() => chatroomStore.attributes)

  function requireRoomId(): string {
    const id = chatroomStore.roomId
    if (!id)
      throw new Error('[UIKit:Chatroom] 未加入聊天室，无法操作房间属性')
    return id
  }

  /** 读取单个属性（本地缓存） */
  function getAttribute(key: string): string | undefined {
    return chatroomStore.attributes[key]
  }

  /** 拼接带场景前缀的属性 key（如 prefixedKey(CHATROOM_ATTR_PREFIX.LIVE, 'productId') → 'live_productId'） */
  function prefixedKey(prefix: ChatroomAttrPrefixValue, key: string): string {
    return `${prefix}${key}`
  }

  /**
   * 设置房间属性：本地即时生效 → 推送服务端。
   * 整体失败回滚本地缓存；部分 key 失败时仅回滚失败 key 并 toast 提示。
   */
  async function setAttributes(
    attrs: ChatroomAttributes,
    options: { autoDelete?: boolean, isForced?: boolean } = {},
  ): Promise<ChatroomAttributeMutationResult> {
    const id = requireRoomId()
    const snapshot = { ...chatroomStore.attributes }
    chatroomStore.mergeAttributes(attrs)
    try {
      const result = await adapter.setAttributes(id, attrs, options)
      const failed = Object.keys(result.failedKeys)
      if (failed.length > 0) {
        // 部分失败：失败 key 回滚到快照值（快照中不存在则删除）
        const restore: ChatroomAttributes = {}
        const remove: string[] = []
        for (const key of failed) {
          if (key in snapshot)
            restore[key] = snapshot[key]!
          else
            remove.push(key)
        }
        chatroomStore.mergeAttributes(restore)
        chatroomStore.removeAttributeKeys(remove)
        toast.error(t('chatroom.error.operationFailed'))
      }
      return result
    }
    catch (error) {
      chatroomStore.setAttributes(snapshot)
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.operationFailed', t))
      throw error
    }
  }

  /** 删除房间属性：本地即时生效 → 推送服务端，失败回滚 */
  async function removeAttributes(
    keys: string[],
    options: { isForced?: boolean } = {},
  ): Promise<ChatroomAttributeMutationResult> {
    const id = requireRoomId()
    const snapshot = { ...chatroomStore.attributes }
    chatroomStore.removeAttributeKeys(keys)
    try {
      return await adapter.removeAttributes(id, keys, options)
    }
    catch (error) {
      chatroomStore.setAttributes(snapshot)
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.operationFailed', t))
      throw error
    }
  }

  /** 全量拉取兜底（keys 缺省时拉全部；进房时 useChatroom 已自动调用一次） */
  async function refresh(keys?: string[]): Promise<void> {
    const id = requireRoomId()
    const attrs = await adapter.getAttributes(id, keys)
    if (chatroomStore.roomId !== id)
      return
    if (keys)
      chatroomStore.mergeAttributes(attrs)
    else
      chatroomStore.setAttributes(attrs)
  }

  return {
    attributes,
    getAttribute,
    prefixedKey,
    setAttributes,
    removeAttributes,
    refresh,
  }
}
