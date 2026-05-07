import { defineStore } from 'pinia'
import { shallowRef, computed } from 'vue'
import type { UIKitClient } from '../sdk/client'

export const useClientStore = defineStore('client', () => {
  const client = shallowRef<UIKitClient | null>(null)
  const connected = shallowRef(false)
  const connecting = shallowRef(false)
  const currentUser = shallowRef<string>('')

  const isLoggedIn = computed(() => connected.value && !!currentUser.value)

  function setClient(instance: UIKitClient) {
    client.value = instance
  }

  function setConnected(value: boolean) {
    connected.value = value
  }

  function setConnecting(value: boolean) {
    connecting.value = value
  }

  function setCurrentUser(userId: string) {
    currentUser.value = userId
  }

  function clearClient() {
    client.value = null
    connected.value = false
    currentUser.value = ''
  }

  return {
    client,
    connected,
    connecting,
    currentUser,
    isLoggedIn,
    setClient,
    setConnected,
    setConnecting,
    setCurrentUser,
    clearClient,
  }
})
