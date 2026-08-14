import type { StreamMessageStatus } from 'easemob-websdk'
import { STREAM_MESSAGE_STATUS } from '../constants'

/**
 * 流式消息状态判定工具（内核渲染 / 事件层共用）。
 *
 * 终态：正常完成（COMPLETED）/ 单分片完成（START_COMPLETED）/ 异常（ERROR）；
 * 传输中：开始（START）/ 进行中（IN_PROGRESS）。
 * 终态消息收敛为普通文本渲染，不展示打字机光标。
 */

/** 流式是否处于传输中（未到终态） */
export function isStreamActive(status: StreamMessageStatus | undefined): boolean {
  return status === STREAM_MESSAGE_STATUS.START
    || status === STREAM_MESSAGE_STATUS.IN_PROGRESS
}

/** 流式是否已到终态（完成 / 单分片完成 / 异常） */
export function isStreamTerminal(status: StreamMessageStatus | undefined): boolean {
  return status === STREAM_MESSAGE_STATUS.COMPLETED
    || status === STREAM_MESSAGE_STATUS.START_COMPLETED
    || status === STREAM_MESSAGE_STATUS.ERROR
}
