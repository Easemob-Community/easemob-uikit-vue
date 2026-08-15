import { computed, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { useCoreUIKit } from './use-uikit'

/** 存储后端类型 */
export type UIKitStorageType = 'local' | 'session'

/** 存储 key 前缀常量 */
const UIKIT_STORAGE_PREFIX = 'easemob_uikit'

/**
 * 简单哈希函数（用于生成存储 key 前缀，非加密用途）
 * 将 appKey + userId 组合为短前缀，避免 key 过长
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/**
 * 生成 UIKIT 存储完整 key
 * 格式：`easemob_uikit_{hash(appKey_userId)}_{suffix}`
 *
 * 可在非 composable 上下文中使用（如草稿管理），只需传入 appKey 和 userId。
 *
 * @param appKey 环信 appKey
 * @param userId 当前用户 ID
 * @param suffix key 后缀（如 `draft_{conversationId}`）
 */
export function createUIKitStorageKey(appKey: string, userId: string, suffix: string): string {
  const scope = simpleHash(`${appKey}_${userId}`)
  return `${UIKIT_STORAGE_PREFIX}_${scope}_${suffix}`
}

/**
 * 获取指定类型的 Storage 对象
 */
export function getStorageBackend(type: UIKitStorageType): Storage {
  return type === 'session' ? sessionStorage : localStorage
}

/**
 * UIKIT 通用内部存储 Hook
 *
 * 封装 VueUse useStorage，自动以 `easemob_uikit_{hash(appKey_userId)}_{suffix}` 为 key，
 * 确保不同 appKey / 不同用户 的数据天然隔离。
 *
 * @param suffix 存储 key 后缀，如 `draft_{conversationId}`
 * @param defaultValue 默认值
 * @param options.type 存储后端：'local' = localStorage，'session' = sessionStorage，默认 'local'
 *
 * @example
 * ```ts
 * // 在会话 composable 中存储草稿
 * const draft = useUIKitStorage<string>(`draft_${conversationId}`, '', { type: 'session' })
 * draft.value = '正在输入的内容...'
 * ```
 */
export function useUIKitStorage<T>(
  suffix: string,
  defaultValue: T,
  options?: { type?: UIKitStorageType }
): Ref<T> {
  const { stores } = useCoreUIKit()

  // 在 computed 内部访问 store 属性，确保响应式追踪
  const storageKey = computed(() => {
    return createUIKitStorageKey(
      stores.client.appKey,
      stores.client.currentUser,
      suffix
    )
  })

  const storage = options?.type === 'session' ? sessionStorage : localStorage

  return useStorage<T>(storageKey, defaultValue, storage)
}
