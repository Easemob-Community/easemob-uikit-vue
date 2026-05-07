import { inject, type InjectionKey } from 'vue'
import type { ChatClient } from '../sdk/types'
import type { RootStores } from '../sdk/event-handler'

export interface UIKitContext {
  client: ChatClient | null
  stores: RootStores
  theme: ReturnType<typeof import('../store/theme').useThemeStore>
  locale: ReturnType<typeof import('../locale').useLocale>
}

export const UIKIT_CONTEXT_KEY: InjectionKey<UIKitContext> = Symbol('uikit')

export function useUIKit() {
  const ctx = inject(UIKIT_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useUIKit() must be used within <UIKitProvider>')
  }
  return ctx
}
