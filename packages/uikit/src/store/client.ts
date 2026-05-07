import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatClient } from '../sdk/types'

export const useClientStore = defineStore('client', () => {
  const client = ref<ChatClient | null>(null)
  const connected = ref(false)
  const connecting = ref(false)
  const currentUser = ref<string>('')

  const isLoggedIn = computed(() => connected.value && !!currentUser.value)

  function setClient(instance: ChatClient) {
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
