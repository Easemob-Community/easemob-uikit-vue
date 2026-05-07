import { computed } from 'vue'
import { useUIKit } from './use-uikit'

export function useClient() {
  const { stores } = useUIKit()
  const clientStore = stores.client

  const client = computed(() => clientStore.client)
  const connected = computed(() => clientStore.connected)
  const isLoggedIn = computed(() => clientStore.isLoggedIn)
  const currentUser = computed(() => clientStore.currentUser)

  return {
    client,
    connected,
    isLoggedIn,
    currentUser,
  }
}
