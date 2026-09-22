import { computed, reactive } from 'vue'
import type { SyncStatusPayload } from '@easemob-community/uikit-sdk-contract'
import { createLogger } from '../utils/logger'

const syncLog = createLogger('UIKit:SyncStatus')

/** 同步数据类型 */
export type SyncDataType = SyncStatusPayload['type']

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

// 模块级单例：core Provider 的 adapter 订阅（onSyncStatus）更新，useSyncStatus 读取。
// 与旧版保持一致只跟踪三类资源；message 同步走 message store 的 isSyncingMessages 横幅。
const syncStateMap = reactive<Record<'conversation' | 'contact' | 'group', SyncState>>({
  conversation: { status: 'idle' },
  contact: { status: 'idle' },
  group: { status: 'idle' },
})

/** 更新单类数据的同步状态（仅供 core Provider 的 adapter 事件桥接调用） */
export function setSyncState(payload: SyncStatusPayload) {
  if (payload.type === 'message')
    return
  const target = syncStateMap[payload.type]
  target.status = payload.status
  if (payload.status !== 'syncing')
    target.finishedAt = Date.now()
  if (payload.error !== undefined)
    target.error = payload.error
  syncLog.info(`sync ${payload.type} -> ${payload.status}`, payload.error
    ? { stage: payload.error.stage, retryable: payload.error.retryable, message: payload.error.message }
    : undefined)
}

/** 重置全部同步状态为 idle（登出时调用，防止跨登录会话残留） */
export function resetSyncState() {
  const keys = Object.keys(syncStateMap) as Array<'conversation' | 'contact' | 'group'>
  for (const key of keys) {
    syncStateMap[key] = { status: 'idle' }
  }
  syncLog.info('sync status reset（登出）')
}

/** 数据同步状态 hook：观察 conversation / contact / group 三类数据的同步进度 */
export function useSyncStatus() {
  const status = computed<Record<'conversation' | 'contact' | 'group', SyncState>>(() => ({ ...syncStateMap }))
  const isSyncing = computed(() =>
    Object.values(syncStateMap).some(s => s.status === 'syncing'),
  )
  const allFinished = computed(() =>
    Object.values(syncStateMap).every(s => s.status === 'success' || s.status === 'failed'),
  )
  return { status, isSyncing, allFinished }
}
