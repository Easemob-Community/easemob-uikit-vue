import { computed } from 'vue'
import { resolveSdkErrorMessage, t, useCoreUIKit, useToast } from '@easemob/uikit-core'
import { CHATROOM_PERMISSION } from '../constants'
import type { ChatroomPermissionValue } from '../constants'
import { ChatroomAdapter } from '../sdk/adapter/chatroom-adapter'
import type { ChatroomMember } from '../sdk/domain/chatroom-domain'
import { useChatroomStore } from '../store/chatroom'

/**
 * 聊天室成员管理：成员列表分页加载 / 禁言 / 踢人 / 管理员操作。
 *
 * 权限模型：owner / admin / member 三级（currentRole 来自房间详情接口的
 * permissionType 快照）；`canManage`（owner/admin）供 UI 控制禁言、踢人、
 * 全员禁言、公告编辑、黑/白名单入口显隐。服务端仍做最终权限校验，
 * 越权操作会以错误 toast 兜底。
 */
export function useChatroomMember() {
  const ctx = useCoreUIKit()
  const chatroomStore = useChatroomStore()
  const toast = useToast()

  const adapter = new ChatroomAdapter(ctx.client.value)

  const members = computed(() => chatroomStore.members)
  const membersHasMore = computed(() => chatroomStore.membersHasMore)
  const muteList = computed(() => chatroomStore.muteList)
  const admins = computed(() => chatroomStore.admins)
  const owner = computed(() => chatroomStore.owner)

  /** 当前用户在房间内的权限类型（未进房/详情未就绪时为 none） */
  const currentRole = computed<ChatroomPermissionValue>(
    () => chatroomStore.info?.permissionType ?? CHATROOM_PERMISSION.NONE,
  )
  const isOwner = computed(() => currentRole.value === CHATROOM_PERMISSION.OWNER)
  /** owner/admin：可执行禁言、踢人、全员禁言、公告等管理操作 */
  const canManage = computed(
    () => currentRole.value === CHATROOM_PERMISSION.OWNER || currentRole.value === CHATROOM_PERMISSION.ADMIN,
  )

  function requireRoomId(): string {
    const id = chatroomStore.roomId
    if (!id)
      throw new Error('[UIKit:Chatroom] 未加入聊天室，无法执行成员操作')
    return id
  }

  /** 统一错误处理：toast 本地化文案并 rethrow（供业务方进一步处理） */
  async function run<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op()
    }
    catch (error) {
      toast.error(resolveSdkErrorMessage(error, 'chatroom.error.operationFailed', t))
      throw error
    }
  }

  /** 成员列表加载中（in-flight 守卫，防快速滚动连续 loadMore 并发拉取同游标重复追加） */
  let loadingMembers = false

  /**
   * 加载成员列表（游标分页）。
   * 大房间不做全量加载：成员面板只渲染已加载页，滚动到底部传 loadMore=true 继续加载。
   */
  async function loadMembers(loadMore = false, pageSize?: number): Promise<void> {
    if (loadingMembers)
      return
    const id = requireRoomId()
    loadingMembers = true
    try {
      const page = await run(() =>
        adapter.getMemberList(id, loadMore ? chatroomStore.memberCursor : undefined, pageSize))
      if (chatroomStore.roomId !== id)
        return
      chatroomStore.setMemberPage(page.items, page.cursor, page.hasMore ?? false, loadMore)
    }
    finally {
      loadingMembers = false
    }
  }

  /** 当前用户是否在白名单中（全员禁言时白名单成员仍可发言；P2 review P1-8） */
  function isInAllowlist(): Promise<boolean> {
    return run(() => adapter.checkIfInAllowList(requireRoomId()))
  }

  /** 更新房间公告（仅 owner/admin，SDK 服务端做最终校验） */
  function updateAnnouncement(content: string): Promise<void> {
    return run(() => adapter.updateAnnouncement(requireRoomId(), content))
  }

  /** 黑名单分页加载（大房间同样不做全量加载；loadMore=true 追加下一页） */
  async function loadBlocklist(loadMore = false, pageSize?: number): Promise<ChatroomMember[]> {
    const id = requireRoomId()
    const page = await run(() => adapter.getBlocklist(id, {
      pageNum: loadMore ? Math.ceil(chatroomStore.members.length / 20) + 1 : 1,
      pageSize: pageSize ?? 20,
    }))
    if (chatroomStore.roomId !== id)
      return []
    return page
  }

  /** 移出黑名单（解除拉黑） */
  async function unblockMembers(userIds: string[]): Promise<void> {
    await run(() => adapter.unblockMembers(requireRoomId(), userIds))
  }

  /** 刷新禁言名单（管理面板打开时调用） */
  async function refreshMuteList(pageNum?: number, pageSize?: number): Promise<void> {
    const id = requireRoomId()
    const items = await run(() => adapter.getMuteList(id, { pageNum, pageSize }))
    if (chatroomStore.roomId !== id)
      return
    chatroomStore.setMuteList(items)
  }

  /** 禁言成员（duration 单位：秒） */
  function muteMembers(userIds: string[], duration: number) {
    return run(() => adapter.muteMembers(requireRoomId(), userIds, duration))
  }

  /** 解除成员禁言 */
  function unmuteMembers(userIds: string[]) {
    return run(() => adapter.unmuteMembers(requireRoomId(), userIds))
  }

  /** 开启全员禁言 */
  function muteAll() {
    return run(() => adapter.muteAllMembers(requireRoomId()))
  }

  /** 解除全员禁言 */
  function unmuteAll() {
    return run(() => adapter.unmuteAllMembers(requireRoomId()))
  }

  /** 踢出成员 */
  function kickMembers(userIds: string[]) {
    return run(() => adapter.removeMembers(requireRoomId(), userIds))
  }

  /** 设为管理员（仅 owner） */
  function addAdmin(userId: string) {
    return run(() => adapter.addAdmin(requireRoomId(), userId))
  }

  /** 移除管理员（仅 owner） */
  function removeAdmin(userId: string) {
    return run(() => adapter.removeAdmin(requireRoomId(), userId))
  }

  return {
    members,
    membersHasMore,
    muteList,
    admins,
    owner,
    currentRole,
    isOwner,
    canManage,
    loadMembers,
    refreshMuteList,
    isInAllowlist,
    updateAnnouncement,
    loadBlocklist,
    unblockMembers,
    muteMembers,
    unmuteMembers,
    muteAll,
    unmuteAll,
    kickMembers,
    addAdmin,
    removeAdmin,
  }
}
