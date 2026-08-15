import { computed, ref, watch, nextTick, isRef, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { createUIKitStorageKey, getStorageBackend, type UIKitStorageType } from './use-uikit-storage'
import { useUIKit } from './use-uikit'
import type { UiContactInvite } from '../sdk/types'
import type { RootStores } from '../sdk/event/types'

export type InvitePersistType = boolean | UIKitStorageType

function resolveStorageType(type: InvitePersistType | undefined): UIKitStorageType | undefined {
  if (type === true) return 'local'
  if (type === false || type === undefined || type === null) return undefined
  return type
}

/**
 * 好友申请 / 群邀请通知持久化内部实现。
 * 直接传入 stores，可在 Provider 等无法调用 useUIKit() 的场景使用。
 */
export function useInvitePersistenceInternal(
  enabled: InvitePersistType | Ref<InvitePersistType>,
  stores: RootStores,
) {
  const persistType = computed(() =>
    resolveStorageType(isRef(enabled) ? enabled.value : enabled),
  )
  const isEnabled = computed(() => !!persistType.value)
  const isRestoring = ref(false)

  // storage key 随 appKey / currentUser 变化自动隔离
  const storageKey = computed(() =>
    createUIKitStorageKey(stores.client.appKey, stores.client.currentUser, 'pending_invites'),
  )

  // 始终调用 useStorage 以保证组合式规范；未启用时返回默认值且不监听写入
  const storageRef = useStorage<UiContactInvite[]>(
    storageKey,
    [],
    getStorageBackend(persistType.value || 'local'),
  )

  function shouldSkipRestore(invite: UiContactInvite): boolean {
    if (stores.contact.getInvite(invite.id)) return true
    if (invite.type === 'contact' && invite.userId && stores.contact.getContact(invite.userId)) return true
    if (invite.type === 'group' && invite.groupId && stores.group.getGroupById(invite.groupId)) return true
    return false
  }

  function restore() {
    if (!isEnabled.value) return
    const list = storageRef.value
    if (!list.length || isRestoring.value) return
    isRestoring.value = true
    for (const invite of list) {
      if (shouldSkipRestore(invite)) continue
      stores.contact.addInvite(invite)
    }
    nextTick(() => {
      isRestoring.value = false
    })
  }

  function persist() {
    if (!isEnabled.value || isRestoring.value) return
    storageRef.value = stores.contact.inviteList.filter(i => i.status === 'pending')
  }

  // 加载时立即恢复一次（用于组件外提前读取徽章）
  restore()

  // 监听 storage 变化（跨标签或重新登录）
  watch(
    storageRef,
    () => {
      if (!isEnabled.value) return
      restore()
    },
    { immediate: false },
  )

  // 监听 store 变化，持久化 pending 列表
  watch(
    () => stores.contact.inviteList,
    () => {
      if (!isEnabled.value) return
      persist()
    },
    { deep: true },
  )

  return {
    isEnabled,
    restore,
    persist,
    storageRef,
  }
}

/**
 * 好友申请 / 群邀请通知持久化。
 *
 * 说明：websdk2 没有提供拉取「待处理通知列表」的 REST/本地接口，通知只能依赖事件流。
 * 开启持久化后，未处理（pending）的邀请会在 localStorage/sessionStorage 中落盘，
 * 刷新页面或重新登录同一账号后可恢复，避免事件丢失导致通知入口不显示红点。
 *
 * 注意：持久化 key 基于当前 appKey + userId，切换账号会自动隔离；登出不会删除，
 * 下次同一账号登录仍可见，服务端事件会二次校验状态。
 */
export function useInvitePersistence(enabled: InvitePersistType | Ref<InvitePersistType>) {
  const { stores } = useUIKit()
  return useInvitePersistenceInternal(enabled, stores)
}
