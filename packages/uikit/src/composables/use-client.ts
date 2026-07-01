import { computed } from 'vue'
import { useUIKit } from './use-uikit'

export function useClient() {
  const { client, stores } = useUIKit()
  const clientStore = stores.client

  const connected = computed(() => clientStore.connected)
  const connecting = computed(() => clientStore.connecting)
  const isLoggedIn = computed(() => clientStore.connected && !!clientStore.currentUser)
  const currentUser = computed(() => clientStore.currentUser)
  const sdkClient = computed(() => client.value)

  return {
    client,
    sdkClient,
    connected,
    connecting,
    isLoggedIn,
    currentUser,
  }
}
