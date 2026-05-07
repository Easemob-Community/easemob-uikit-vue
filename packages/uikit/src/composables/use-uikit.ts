import { inject, type InjectionKey, type Ref } from 'vue'
import type { UIKitClient } from '../sdk/client'
import type { RootStores } from '../sdk/event-handler'

export interface UIKitContext {
  client: Ref<UIKitClient | null>
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
