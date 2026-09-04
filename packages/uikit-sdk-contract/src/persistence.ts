/**
 * 旁路持久化（persistence）钩子契约：Electron 本地库（SQLite）等实现的接入点。
 *
 * 与 `repository.ts` 的语义区别：
 * - **repository（数据入口接管）**：替换 SDK 读路径，UIKit 数据源改由注入方提供；
 * - **persistence（旁路写库）**：SDK 行为完全不变，收发 / 状态变更事件后旁路同步
 *   给本地库，只写不读（读路径由 repository 另行接管）。
 *
 * 统一约定：
 * - **fire-and-forget**：调用方不 await；实现方内部排队 / 批量 / 事务 / IPC 自行负责；
 * - 钩子抛错 / reject 只告警（logger），不阻塞消息链路；
 * - 所有方法可选：未注入的钩子直接跳过对应同步；
 * - `saveMessage` 按 `msgServerId` upsert 是实现方责任（重复投递 / 状态回流会重放）。
 */

import type { MessageStatusValue } from './constants'
import type { MessageBody, MessageModifiedInfo } from './types/message/body'
import type { ConversationRecord, MessageRecord } from './types/message/record'

/**
 * 消息旁路写库钩子（全部可选，返回 `void | Promise<void>`）。
 */
export interface MessagePersistenceHooks {
  /**
   * 单条落库：收发消息、漫游逐条回流时触发。
   * 实现方按 `record.msgServerId` upsert（服务端未回填前可用 `msgLocalId` 暂存并后续合并）。
   */
  saveMessage?: (record: MessageRecord) => void | Promise<void>

  /**
   * 批量落库：漫游历史大批量回流场景，减少逐条 IPC / 事务开销。
   * 与 saveMessage 同 upsert 语义；实现方自行决定批大小与事务边界。
   */
  saveMessages?: (records: MessageRecord[]) => void | Promise<void>

  /**
   * 更新发送 / 送达 / 已读状态（`sendStatus` 及回执驱动）。
   * 实现方按 msgId（`msgServerId`，本地未回填期允许 `msgLocalId`）定位行。
   */
  updateMessageStatus?: (msgId: string, status: MessageStatusValue) => void | Promise<void>

  /**
   * 撤回墓碑：置 `recalled = true` + `tombstoneTime`，不物理删除。
   * `operatorId` 为撤回操作者（本人撤回 / 管理员撤回 / 对端撤回场景）。
   */
  markMessageRecalled?: (msgId: string, operatorId?: string) => void | Promise<void>

  /**
   * 消息编辑：更新 body / ext，并记录 `modifiedInfo`（修改次数 / 操作者 / 时间）。
   * body 为清洗后的纯数据（实现方如需再保险可自行过一遍 `toMessageRecord` 语义）。
   */
  updateMessageContent?: (
    msgId: string,
    body: MessageBody,
    ext: Record<string, unknown>,
    modifiedInfo?: MessageModifiedInfo,
  ) => void | Promise<void>

  /**
   * 删除墓碑：置 `deleted = true` + `tombstoneTime`，不物理删除。
   * 本地删除 / 多选删除场景批量触发。
   */
  deleteMessages?: (msgIds: string[]) => void | Promise<void>

  /**
   * 消息置顶校准：远端 pin / unpin 事件旁路 + 本地置顶操作。
   * `pinnedTime` 为置顶时间戳（毫秒），`null` 表示取消置顶；
   * fire-and-forget，实现方按 msgId（`msgServerId` 优先，未回填期允许 `msgLocalId`）定位行。
   * Pinned-state sync: driven by remote pin/unpin events and local pin actions;
   * `pinnedTime = null` clears the pin. Fire-and-forget.
   */
  updateMessagePinned?: (msgId: string, pinnedTime: number | null) => void | Promise<void>
}

/**
 * 会话旁路写库钩子（全部可选，返回 `void | Promise<void>`）。
 */
export interface ConversationPersistenceHooks {
  /**
   * 会话快照落库：会话列表刷新 / 单项变更后整体同步（含未读数 / 置顶 / 免打扰等）。
   * 实现方按 `record.id` upsert；增量同步的开销优化（diff / 防抖）由实现方负责。
   */
  saveConversations?: (records: ConversationRecord[]) => void | Promise<void>

  /**
   * 删除会话旁路：会话从列表移除后同步给本地库。
   * 级联语义由 `opts.deleteMessages` 决定：
   * - `true`：级联物理删除该会话消息（含 FTS 索引行）与同步状态行——
   *   「删了就永远不再回来」（微信语义，与清除水位线一致）；
   * - `false` / 缺省：只删会话行，消息保留，会话再次浮现时历史仍在。
   * Cascade semantics of `opts.deleteMessages`: true = physically delete the
   * conversation's messages (and FTS rows / sync state); false/absent = remove
   * the conversation row only, keeping message history.
   */
  removeConversations?: (ids: string[], opts?: { deleteMessages?: boolean }) => void | Promise<void>
}

/**
 * 旁路持久化钩子集合：按域分组注入，未注入的域跳过同步。
 * 经 `SdkConfig.persistence` 传入（见 config.ts）。
 */
export interface SdkPersistenceHooks {
  message?: MessagePersistenceHooks
  conversation?: ConversationPersistenceHooks
}
