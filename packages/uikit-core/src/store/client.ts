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
  const currentUser = shallowRef<string>('')
  const appKey = shallowRef<string>('')

  const isLoggedIn = computed(() => connected.value && !!currentUser.value)

  function setClient(snapshot: ClientSnapshot) {
    client.value = snapshot
  }

  function setConnected(value: boolean) {
    connected.value = value
  }

  function setConnecting(value: boolean) {
    connecting.value = value
  }

  function setHasConnectedOnce(value: boolean) {
    hasConnectedOnce.value = value
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
    currentUser.value = ''
    appKey.value = ''
  }

  return {
    client,
    connected,
    connecting,
    hasConnectedOnce,
    currentUser,
    appKey,
    isLoggedIn,
    setClient,
    setConnected,
    setConnecting,
    setHasConnectedOnce,
    setCurrentUser,
    setAppKey,
    clearClient,
  }
})
