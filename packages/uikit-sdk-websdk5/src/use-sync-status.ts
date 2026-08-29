import { computed, reactive } from 'vue'
import type { SyncDataType } from 'easemob-websdk'
import { createLogger } from '@easemob/uikit-sdk-contract'

const syncLog = createLogger('UIKit:SyncStatus')

/**
 * 单类数据的同步阶段。
 * 由 SDK 登录后的自动同步事件（onSyncDataStart / onSyncDataFinished）驱动：
 * idle（未开始）→ syncing（同步中）→ success / failed（终结态）。
 */
export type SyncPhase = 'idle' | 'syncing' | 'success' | 'failed'

/** 单类数据的同步状态 */
export interface SyncState {
  status: SyncPhase
  finishedAt?: number
  error?: {
    stage?: string
    retryable?: boolean
    message?: string
  }
}

// 模块级单例：chat-events 的 onSyncDataStart/Finished 更新，useSyncStatus 读取。
const syncStateMap = reactive<Record<SyncDataType, SyncState>>({
  conversation: { status: 'idle' },
  contact: { status: 'idle' },
  group: { status: 'idle' },
})

/** 更新单类数据的同步状态（仅供事件层 chat-events 内部调用） */
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

/** 重置全部同步状态为 idle（登出/事件反注册时调用，防止跨登录会话残留） */
export function resetSyncStatus() {
  const keys = Object.keys(syncStateMap) as SyncDataType[]
  for (const key of keys) {
    syncStateMap[key] = { status: 'idle' }
  }
  syncLog.info('sync status reset（事件反注册/登出）')
}

/** 数据同步状态 hook：观察 conversation / contact / group 三类数据的同步进度 */
export function useSyncStatus() {
  const status = computed<Record<SyncDataType, SyncState>>(() => ({ ...syncStateMap }))
  const isSyncing = computed(() =>
    Object.values(syncStateMap).some(s => s.status === 'syncing'),
  )
  const allFinished = computed(() =>
    Object.values(syncStateMap).every(s => s.status === 'success' || s.status === 'failed'),
  )
  return { status, isSyncing, allFinished }
}
