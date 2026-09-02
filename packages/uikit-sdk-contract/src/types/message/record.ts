import type { UiConversation } from '../conversation'
import type { SdkMessage } from './body'

/**
 * 消息入库 DTO：`SdkMessage` 的纯数据子集 + 墓碑字段。
 *
 * 旁路持久化（persistence）专用：供本地库（如 Electron SQLite）落库。
 * 与 `SdkMessage` 字段同名同义，区别在约束：
 * - **JSON 安全**：禁止 File / Blob / 函数值；附件只保留 url / secret /
 *   filename / fileLength / duration 等元数据，二进制不入库。
 *   由 `toMessageRecord`（`utils/record.ts`）负责从 `SdkMessage` 清洗生成。
 * - **墓碑语义**：撤回 / 删除不物理删行，置 `recalled` / `deleted` 并记
 *   `tombstoneTime`；查询侧自行过滤或渲染占位。
 * - UI 展示态（翻译 / 语音转文字 / 置顶 / 发送进度等）v1 不入库，
 *   唯一例外是 `recalled`（撤回是内容语义，必须保留）。
 */
export interface MessageRecord extends SdkMessage {
  /** 是否已撤回（墓碑：不物理删除，查询侧自行过滤） */
  recalled?: boolean
  /** 是否已删除（墓碑：不物理删除，查询侧自行过滤） */
  deleted?: boolean
  /** 墓碑置位时间戳（毫秒）；recalled / deleted 置位时由实现方写入 */
  tombstoneTime?: number
}

/**
 * 会话入库 DTO。
 *
 * `UiConversation` 本身已是纯数据（全标量字段），可直接作为入库形状；
 * 独立别名仅为语义分层（入库契约 vs UI 展示类型），后续如需收窄可改为子集。
 * 由 `toConversationRecord`（`utils/record.ts`）负责防御性清洗。
 */
export type ConversationRecord = UiConversation
