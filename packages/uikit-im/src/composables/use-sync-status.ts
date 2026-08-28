import { computed, reactive } from 'vue'
import type { SyncDataType } from 'easemob-websdk'
import { createLogger } from '@easemob/uikit-core'

const syncLog = createLogger('UIKit:SyncStatus')

/**
 * 单类数据的同步阶段。
 * 由 SDK 登录后的自动同步事件（onSyncDataStart / onSyncDataFinished）驱动：
 * idle（未开始）→ syncing（同步中）→ success / failed（终结态）。
 */
export type SyncPhase = 'idle' | 'syncing' | 'success' | 'failed'

/** 单类数据的同步状态 */
export interface SyncState {
  /** 当前同步阶段 */
  status: SyncPhase
  /** 最近一次同步完成时间戳（success/failed 时填充） */
  finishedAt?: number
  /** 最近一次失败详情（failed 时填充） */
  error?: {
    /** 失败阶段（SDK SyncDataError.stage） */
    stage?: string
    /** 是否建议重试（SDK SyncDataError.retryable） */
    retryable?: boolean
    /** 错误消息 */
    message?: string
  }
}

// 模块级单例：chat-events 的 onSyncDataStart/Finished 更新，useSyncStatus 读取。
// 不落 Pinia store：同步状态是「事件驱动的运行时诊断信息」，跨组件共享即可，
// 登出时由 resetSyncStatus 归零，避免跨登录会话残留。
const syncStateMap = reactive<Record<SyncDataType, SyncState>>({
  conversation: { status: 'idle' },
  contact: { status: 'idle' },
  group: { status: 'idle' },
})

/**
 * 更新单类数据的同步状态（仅供事件层 chat-events 内部调用）。
 * 状态变化会输出到 `UIKit:SyncStatus` logger，便于观察同步机制动作。
 */
export function setSyncStatus(dataType: SyncDataType, patch: SyncState) {
  const target = syncStateMap[dataType]
  target.status = patch.status
  if (patch.finishedAt !== undefined)
    target.finishedAt = patch.finishedAt
  if (patch.error !== undefined)
    target.error = patch.error
  syncLog.info(`sync ${dataType} -> ${patch.status}`, patch.error
    ? { stage: patch.error.stage, retryable: patch.error.retryable, message: patch.error.message }
    : undefined)
}

/**
 * 重置全部同步状态为 idle（登出/事件反注册时调用，防止跨登录会话残留）。
 */
export function resetSyncStatus() {
  const keys = Object.keys(syncStateMap) as SyncDataType[]
  for (const key of keys) {
    syncStateMap[key] = { status: 'idle' }
  }
  syncLog.info('sync status reset（事件反注册/登出）')
}

/**
 * 数据同步状态 hook：观察 conversation / contact / group 三类数据的同步进度。
 *
 * 背景：登录后 SDK 按 enableSyncData 自动同步会话/联系人/群组，UIKit 在
 * onSyncDataFinished 时把 SDK 内存数据回填到 store。本 hook 把该过程
 * 暴露给业务方，便于在同步完成/失败后做补偿（如提示重试、主动刷新列表）。
 *
 * 注意：contact/group 无「主动触发同步」的 SDK 公开接口，失败后只能等待
 * 下次连接/登录的自动同步；conversation 可用 useConversation().refreshConversations()
 * 主动重试。
 */
export function useSyncStatus() {
  /** 各数据类型同步状态快照（reactive 派生的只读计算属性） */
  const status = computed<Record<SyncDataType, SyncState>>(() => ({ ...syncStateMap }))

  /** 是否存在正在进行的同步 */
  const isSyncing = computed(() =>
    Object.values(syncStateMap).some(s => s.status === 'syncing'),
  )

  /** 是否所有启用的数据类型均已进入终结态（success / failed） */
  const allFinished = computed(() =>
    Object.values(syncStateMap).every(s => s.status === 'success' || s.status === 'failed'),
  )

  return {
    status,
    isSyncing,
    allFinished,
  }
}
