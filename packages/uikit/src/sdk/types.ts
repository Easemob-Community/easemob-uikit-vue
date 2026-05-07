// SDK Type Definitions

export interface ChatClient {
  id: string
  addEventHandler: (id: string, handler: ChatEventHandler) => void
  removeEventHandler: (id: string) => void
  open: (params: { user: string; accessToken?: string }) => Promise<void>
  close: () => Promise<void>
  sendMessage: (msg: ChatMessage) => Promise<void>
}

export interface ChatEventHandler {
  onTextMessage?: (msg: ChatMessage) => void
  onImageMessage?: (msg: ChatMessage) => void
  onVoiceMessage?: (msg: ChatMessage) => void
  onVideoMessage?: (msg: ChatMessage) => void
  onFileMessage?: (msg: ChatMessage) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: ChatError) => void
}

export interface ChatMessage {
  id: string
  type: string
  from: string
  to: string
  body: Record<string, any>
  timestamp: number
}

export interface ChatError {
  code: number
  description: string
}

export interface ClientConfig {
  appKey: string
  apiUrl?: string
  debug?: boolean
}
