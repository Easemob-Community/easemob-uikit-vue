import { computed, reactive } from 'vue'
import { createLogger } from '@easemob/uikit-sdk-contract'
import type { SyncStatusPayload } from '@easemob/uikit-sdk-contract'

const syncLog = createLogger('UIKit:Webim4SyncStatus')

/**
 * 4.x 数据同步类型。
 * 4.x 无 5.x 的分类型 onSyncDataStart/Finished 事件，只有连接级
 * onOfflineMessageSyncStart/Finish（离线消息）——conversation/contact/group
 * 的同步事件由各自 domain/事件层按需上报（无对应能力时保持 idle）。
 */
export type SyncDataType = 'message' | 'conversation' | 'contact' | 'group'

/**
 * 单类数据的同步阶段。
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

// 模块级单例：connection-events / chat-events 更新，useSyncStatus 读取。
const syncStateMap = reactive<Record<SyncDataType, SyncState>>({
  message: { status: 'idle' },
  conversation: { status: 'idle' },
  contact: { status: 'idle' },
  group: { status: 'idle' },
})

/** 同步状态变更监听器（由 adapter 注入，用于把模块内状态翻译成 SdkEventHandlers.onSyncStatus） */
let syncStatusListener: ((payload: SyncStatusPayload) => void) | null = null

/** 注册同步状态监听器；返回取消注册函数 */
export function setSyncStatusListener(listener: ((payload: SyncStatusPayload) => void) | null): () => void {
  syncStatusListener = listener
  return () => {
    syncStatusListener = null
  }
}

/** 更新单类数据的同步状态（仅供事件层内部调用） */
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

  syncStatusListener?.({
    type: dataType,
    status: patch.status === 'idle' ? 'syncing' : patch.status,
    error: patch.error,
  })
}

/** 重置全部同步状态为 idle（登出/事件反注册时调用，防止跨登录会话残留） */
export function resetSyncStatus() {
  const keys = Object.keys(syncStateMap) as SyncDataType[]
  for (const key of keys) {
    syncStateMap[key] = { status: 'idle' }
  }
  syncLog.info('sync status reset（事件反注册/登出）')
}

/** 数据同步状态 hook：观察 message / conversation / contact / group 四类数据的同步进度 */
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
