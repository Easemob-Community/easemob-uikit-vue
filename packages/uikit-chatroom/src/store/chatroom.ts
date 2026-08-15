import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { CHATROOM_MEMBER_ROLE, CHATROOM_STATUS } from '../constants'
import type { ChatroomStatusValue } from '../constants'
import type { Chatroom, ChatroomAttributes, ChatroomMember, ChatroomMuteItem } from '../sdk/domain/chatroom-domain'

/**
 * 单房间运行时状态（房间注册表条目；多房间并存时互不干扰）。
 *
 * 状态机：idle → joining → joined → leaving → idle；
 * 异常终态：kicked（被移出）/ destroyed（房间解散），均由房间事件驱动。
 */
export interface ChatroomRoomState {
  /** 房间类型：interact UI 房（完整容器语义）/ signal 信令房（静默订阅，§5.9） */
  kind: 'interact' | 'signal'
  /** 房间状态机 */
  status: ChatroomStatusValue
  /** 房间 ID（注册表 key） */
  roomId: string
  /** 房间信息（详情接口 + onChatRoomInfoChanged 事件同步） */
  info: Chatroom | null
  /** 已加载成员（游标分页，大房间不做全量加载） */
  members: ChatroomMember[]
  /** 成员分页游标 */
  memberCursor?: string
  membersHasMore: boolean
  /** 禁言名单 */
  muteList: ChatroomMuteItem[]
  /** 是否全员禁言中 */
  isAllMuted: boolean
  /** 房间公告 */
  announcement: string
  /** 房间自定义属性 KV 缓存（四层同步之一：本地即时生效，见 useChatroomAttributes） */
  attributes: ChatroomAttributes
  /** join 竞态令牌（取全局单调计数器，removeRoom 重建后不回退，防陈旧 ACK 撞号） */
  joinToken: number
  /** 断线前处于 joined：连接恢复后需自动重进（useChatroom 装配消费） */
  pendingRejoin: boolean
  /** 断线重连是否自动重进（信令房可配置 autoRejoin: false，§5.9） */
  autoRejoin: boolean
  /** 被移出房间的 SDK 原因码（onRemovedFromChatRoom 事件驱动；供容器 kicked 事件透传） */
  kickReason?: number
}

/**
 * 全局 join 令牌计数器：跨房间单调递增，removeRoom 后重建的房间也不会与
 * 历史令牌撞号（leave-in-flight + 同房重入场景下陈旧 ACK 不会被误接受，P2 review）
 */
let globalJoinToken = 0

function createRoomState(roomId: string, kind: 'interact' | 'signal' = 'interact'): ChatroomRoomState {
  return reactive({
    kind,
    status: CHATROOM_STATUS.IDLE,
    roomId,
    info: null,
    members: [],
    memberCursor: undefined,
    membersHasMore: false,
    muteList: [],
    isAllMuted: false,
    announcement: '',
    attributes: {},
    joinToken: 0,
    pendingRejoin: false,
    autoRejoin: true,
    kickReason: undefined,
  })
}

/**
 * 聊天室房间注册表 + 活动房间视图（**两层建模**，见设计文档 §5.9——单房为其特例）：
 * - `rooms`：所有已加入 / 正在加入的房间状态（Map<roomId, RoomState>），
 *   多房间并存时各自独立（UI 房 + P3 信令房）；join 竞态按 roomId 校验响应归属；
 * - `activeRoomId`：活动房间视图（= UI 房），容器 / 消息流 / 成员管理 / 系统通知
 *   只消费活动房间；信令房只注册不进入活动视图。
 * - 对外字段（status / roomId / info / members / …）一律是**活动房间视图**的
 *   computed，与单房间模型的读法完全一致，composable 层无感。
 */
export const useChatroomStore = defineStore('chatroom', () => {
  /** 房间注册表（reactive Map：set/delete 原生响应） */
  const rooms = reactive(new Map<string, ChatroomRoomState>())
  /** 活动房间视图（= UI 房；idle 时为空串） */
  const activeRoomId = ref('')

  /** 活动房间状态（未登记 / 已清空时为 null） */
  const activeRoom = computed<ChatroomRoomState | null>(() => rooms.get(activeRoomId.value) ?? null)

  // ===== 活动房间视图（对外读字段；消费方与单房间模型写法一致） =====

  const status = computed<ChatroomStatusValue>(() => activeRoom.value?.status ?? CHATROOM_STATUS.IDLE)
  const roomId = computed(() => activeRoomId.value)
  const info = computed<Chatroom | null>(() => activeRoom.value?.info ?? null)
  const members = computed<ChatroomMember[]>(() => activeRoom.value?.members ?? [])
  const memberCursor = computed(() => activeRoom.value?.memberCursor)
  const membersHasMore = computed(() => activeRoom.value?.membersHasMore ?? false)
  const muteList = computed<ChatroomMuteItem[]>(() => activeRoom.value?.muteList ?? [])
  const isAllMuted = computed(() => activeRoom.value?.isAllMuted ?? false)
  const announcement = computed(() => activeRoom.value?.announcement ?? '')
  const attributes = computed<ChatroomAttributes>(() => activeRoom.value?.attributes ?? {})
  const joinToken = computed(() => activeRoom.value?.joinToken ?? 0)
  const pendingRejoin = computed(() => activeRoom.value?.pendingRejoin ?? false)
  const kickReason = computed(() => activeRoom.value?.kickReason)

  const isJoined = computed(() => status.value === CHATROOM_STATUS.JOINED)
  const admins = computed(() => members.value.filter(m => m.role === CHATROOM_MEMBER_ROLE.ADMIN))
  const owner = computed(() => members.value.find(m => m.role === CHATROOM_MEMBER_ROLE.OWNER))

  // ===== 注册表原语 =====

  /** 取指定房间状态（不存在时创建并登记；kind 为创建默认值，实际以 setJoining/setSignalJoining 显式声明为准） */
  function ensureRoom(id: string, kind: 'interact' | 'signal' = 'interact'): ChatroomRoomState {
    let room = rooms.get(id)
    if (!room) {
      room = createRoomState(id, kind)
      rooms.set(id, room)
    }
    return room
  }

  /** 指定房间是否已在注册表（消息事件入桶 / 断线重连全量重进的判定依据） */
  function isKnownRoom(id: string): boolean {
    return rooms.has(id)
  }

  /** 指定房间的类型（未登记时视为 interact） */
  function roomKind(id: string): 'interact' | 'signal' {
    return rooms.get(id)?.kind ?? 'interact'
  }

  /** 指定房间的 join 令牌（未登记时 0；join 超时失效等按房间校验用，P3 review） */
  function roomJoinToken(id: string): number {
    return rooms.get(id)?.joinToken ?? 0
  }

  /** 领取指定房间的 join 令牌（每次 join 调用一次；取全局单调计数器，重建不回退） */
  function nextJoinToken(id: string): number {
    const room = ensureRoom(id)
    room.joinToken = ++globalJoinToken
    return room.joinToken
  }

  /** 校验 join 响应是否仍是最新目标房间（令牌失效或状态已离开 joining/joined 则丢弃） */
  function isCurrentJoin(token: number, id: string): boolean {
    const room = rooms.get(id)
    if (!room || room.joinToken !== token)
      return false
    return room.status === CHATROOM_STATUS.JOINING || room.status === CHATROOM_STATUS.JOINED
  }

  /** UI 房进入 joining（登记 + 切活动视图；kind 显式声明为 interact，P3 review——防已登记信令房被复用为 UI 房的歧义） */
  function setJoining(id: string) {
    const room = ensureRoom(id, 'interact')
    room.kind = 'interact'
    room.status = CHATROOM_STATUS.JOINING
    activeRoomId.value = id
  }

  /** 信令房进入 joining（登记为 signal，不切活动视图——静默订阅，§5.9；kind 显式声明） */
  function setSignalJoining(id: string) {
    const room = ensureRoom(id, 'signal')
    room.kind = 'signal'
    room.status = CHATROOM_STATUS.JOINING
  }

  /** join 成功落地（调用前须过 isCurrentJoin 校验）；作用于指定房间（interact 即活动房间） */
  function setJoined(id: string, roomInfo: Chatroom | null) {
    const room = rooms.get(id)
    if (!room)
      return
    room.status = CHATROOM_STATUS.JOINED
    room.pendingRejoin = false
    if (roomInfo) {
      room.info = roomInfo
      room.announcement = roomInfo.announcement ?? ''
    }
  }

  /** 注册表内所有 joined 房间条目（断线重连全量重进与信令房状态跟踪用，§5.9） */
  const joinedRoomEntries = computed(() =>
    [...rooms.values()]
      .filter(room => room.status === CHATROOM_STATUS.JOINED)
      .map(room => ({ roomId: room.roomId, kind: room.kind, pendingRejoin: room.pendingRejoin, autoRejoin: room.autoRejoin })),
  )

  function setLeaving(id?: string) {
    const room = id ? rooms.get(id) : activeRoom.value
    if (!room)
      return
    if (room.status === CHATROOM_STATUS.JOINED || room.status === CHATROOM_STATUS.JOINING)
      room.status = CHATROOM_STATUS.LEAVING
  }

  /** 被移出房间（onRemovedFromChatRoom 事件驱动）；作用于指定房间，记录 SDK 原因码 */
  function markKicked(id: string, reason?: number) {
    const room = rooms.get(id)
    if (!room)
      return
    room.status = CHATROOM_STATUS.KICKED
    room.pendingRejoin = false
    room.kickReason = reason
  }

  /** 房间解散（onChatRoomDestroyed 事件驱动）；作用于指定房间 */
  function markDestroyed(id: string) {
    const room = rooms.get(id)
    if (!room)
      return
    room.status = CHATROOM_STATUS.DESTROYED
    room.pendingRejoin = false
  }

  /** 移除指定房间（leave 完成 / 断线重进前清理；多房间并存时其余房间保留） */
  function removeRoom(id: string) {
    rooms.delete(id)
    if (activeRoomId.value === id)
      activeRoomId.value = ''
  }

  /** 回到空闲态并清空全部房间数据（logout / 换房前清理） */
  function reset() {
    rooms.clear()
    activeRoomId.value = ''
  }

  // ===== 活动房间信息 / 公告 / 属性 =====

  function setInfo(roomInfo: Chatroom) {
    const room = activeRoom.value
    if (room)
      room.info = roomInfo
  }

  function setAnnouncement(content: string) {
    const room = activeRoom.value
    if (room)
      room.announcement = content
  }

  /** 全量替换属性缓存（进房 getAttributes 兜底拉取） */
  function setAttributes(attrs: ChatroomAttributes) {
    const room = activeRoom.value
    if (room)
      room.attributes = { ...attrs }
  }

  /** 增量合并属性（本地乐观生效 / onAttributesUpdate 事件） */
  function mergeAttributes(patch: ChatroomAttributes) {
    const room = activeRoom.value
    if (room)
      room.attributes = { ...room.attributes, ...patch }
  }

  /** 删除属性 key（removeAttributes / onAttributesRemoved 事件） */
  function removeAttributeKeys(keys: readonly string[]) {
    const room = activeRoom.value
    if (!room)
      return
    const next = { ...room.attributes }
    for (const key of keys)
      delete next[key]
    room.attributes = next
  }

  function setAllMuted(value: boolean) {
    const room = activeRoom.value
    if (room)
      room.isAllMuted = value
  }

  /** 成员数增减（成员进出事件驱动；info 为空时不维护） */
  function incrementMemberCount(delta: number) {
    const room = activeRoom.value
    if (!room || !room.info || room.info.memberCount === undefined)
      return
    room.info = { ...room.info, memberCount: Math.max(0, room.info.memberCount + delta) }
  }

  // ===== 成员 / 禁言名单（均作用于活动房间） =====

  /** 写入成员分页（append=false 覆盖首页，true 追加下一页） */
  function setMemberPage(items: ChatroomMember[], cursor: string | undefined, hasMore: boolean, append: boolean) {
    const room = activeRoom.value
    if (!room)
      return
    room.members = append ? [...room.members, ...items] : items
    room.memberCursor = cursor
    room.membersHasMore = hasMore
  }

  /** 更新成员角色（管理员/房主变更事件驱动；成员不在已加载列表时忽略） */
  function updateMemberRole(userId: string, role: ChatroomMember['role']) {
    const room = activeRoom.value
    if (!room)
      return
    const index = room.members.findIndex(m => m.userId === userId)
    if (index === -1)
      return
    const next = [...room.members]
    next[index] = { ...next[index]!, role }
    room.members = next
  }

  /** 从已加载成员列表移除（成员退出/被踢事件驱动） */
  function removeMembersByIds(userIds: readonly string[]) {
    const room = activeRoom.value
    if (!room)
      return
    const ids = new Set(userIds)
    room.members = room.members.filter(m => !ids.has(m.userId))
  }

  function setMuteList(items: ChatroomMuteItem[]) {
    const room = activeRoom.value
    if (room)
      room.muteList = items
  }

  /** 追加禁言条目（onMuteListAdded 事件驱动，按 userId 去重） */
  function addMuteItems(items: ChatroomMuteItem[]) {
    const room = activeRoom.value
    if (!room)
      return
    const existing = new Set(room.muteList.map(i => i.userId))
    room.muteList = [...room.muteList, ...items.filter(i => !existing.has(i.userId))]
  }

  function removeMuteItemsByIds(userIds: readonly string[]) {
    const room = activeRoom.value
    if (!room)
      return
    const ids = new Set(userIds)
    room.muteList = room.muteList.filter(i => !ids.has(i.userId))
  }

  /** 指定房间状态机值（未登记回落 idle） */
  function roomStatus(id: string): ChatroomStatusValue {
    return rooms.get(id)?.status ?? CHATROOM_STATUS.IDLE
  }

  /** 设置指定房间的断线重进标记（信令房 join 时经 autoRejoin 配置） */
  function setRoomPendingRejoin(id: string, value: boolean) {
    const room = rooms.get(id)
    if (room)
      room.pendingRejoin = value
  }

  function setPendingRejoin(value: boolean) {
    const room = activeRoom.value
    if (room)
      room.pendingRejoin = value
  }

  return {
    // 注册表原语
    ensureRoom,
    isKnownRoom,
    roomKind,
    roomJoinToken,
    nextJoinToken,
    isCurrentJoin,
    removeRoom,
    // 状态机
    setJoining,
    setSignalJoining,
    setJoined,
    joinedRoomEntries,
    setLeaving,
    markKicked,
    markDestroyed,
    reset,
    // 活动房间视图（读）
    status,
    roomId,
    info,
    members,
    memberCursor,
    membersHasMore,
    muteList,
    isAllMuted,
    announcement,
    attributes,
    joinToken,
    pendingRejoin,
    kickReason,
    isJoined,
    admins,
    owner,
    // 活动房间信息/公告/属性
    setInfo,
    setAnnouncement,
    setAttributes,
    mergeAttributes,
    removeAttributeKeys,
    setAllMuted,
    incrementMemberCount,
    // 成员/禁言名单
    setMemberPage,
    updateMemberRole,
    removeMembersByIds,
    setMuteList,
    addMuteItems,
    removeMuteItemsByIds,
    roomStatus,
    setRoomPendingRejoin,
    setPendingRejoin,
  }
})
