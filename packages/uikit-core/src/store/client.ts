import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

/** client store 持有的连接配置快照（事件层读取 deleteConversationOnGroupDestroyed） */
export interface ClientSnapshot {
  deleteConversationOnGroupDestroyed?: boolean
}

export const useClientStore = defineStore('client', () => {
  const client = shallowRef<ClientSnapshot | null>(null)
  const connected = shallowRef(false)
  const connecting = shallowRef(false)
  /** 是否已成功连接过：true 之后再次 onConnecting 即为自动重连，用于区分首连/重连文案 */
  const hasConnectedOnce = shallowRef(false)
  /**
   * 账号被踢/失效标记（多端互踢 206 / 注销 207 / 设备超限 214 / 改密 216 / 被踢 217）：
   * 账号态终态，SDK 不再自动重连，UI 应展示被踢文案而非网络异常；重新连接成功（onConnected）时清除。
   */
  const kicked = shallowRef(false)
  /** 被踢的 SDK 错误码（见 sdk-contract KICK_ERROR_CODE），用于差异化文案 */
  const kickCode = shallowRef<number | undefined>(undefined)
  const currentUser = shallowRef<string>('')
  const appKey = shallowRef<string>('')

  const isLoggedIn = computed(() => connected.value && !!currentUser.value)

  function setClient(snapshot: ClientSnapshot) {
    client.value = snapshot
  }

  function setConnected(value: boolean) {
    connected.value = value
    // 重新连接成功即恢复账号态（用户已完成重新登录）
    if (value) {
      kicked.value = false
      kickCode.value = undefined
    }
  }

  function setConnecting(value: boolean) {
    connecting.value = value
  }

  function setHasConnectedOnce(value: boolean) {
    hasConnectedOnce.value = value
  }

  /** 标记账号被踢/失效（连接事件层在 onDisconnected 中按错误码调用） */
  function setKicked(code?: number) {
    kicked.value = true
    kickCode.value = code
  }

  function setCurrentUser(userId: string) {
    currentUser.value = userId
  }

  function setAppKey(key: string) {
    appKey.value = key
  }

  function clearClient() {
    client.value = null
    connected.value = false
    connecting.value = false
    hasConnectedOnce.value = false
    kicked.value = false
    kickCode.value = undefined
    currentUser.value = ''
    appKey.value = ''
  }

  return {
    client,
    connected,
    connecting,
    hasConnectedOnce,
    kicked,
    kickCode,
    currentUser,
    appKey,
    isLoggedIn,
    setClient,
    setConnected,
    setConnecting,
    setHasConnectedOnce,
    setKicked,
    setCurrentUser,
    setAppKey,
    clearClient,
  }
})
