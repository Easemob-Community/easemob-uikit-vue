import type { ChatClient, ClientConfig } from './types'

let clientInstance: ChatClient | null = null

export function createClient(config: ClientConfig): ChatClient {
  // Placeholder: actual implementation uses easemob-websdk
  const client: ChatClient = {
    id: config.appKey,
    addEventHandler: () => {},
    removeEventHandler: () => {},
    open: async () => {},
    close: async () => {},
    sendMessage: async () => {},
  }

  clientInstance = client
  return client
}

export function getClient(): ChatClient | null {
  return clientInstance
}


