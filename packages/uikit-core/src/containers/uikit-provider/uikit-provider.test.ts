// @vitest-environment jsdom
import { createApp, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import CoreUIKitProvider from './uikit-provider.vue'

vi.mock('../../composables/use-uikit', () => ({
  useCoreUIKitProvider: () => ({
    h5: {
      visibleHeight: ref(0),
      viewportOffsetTop: ref(0),
    },
  }),
}))

vi.mock('../../composables/use-provider-side-effects', () => ({
  createUserInfoSubscriptionErrorHandler: vi.fn(),
  useProviderSideEffects: () => ({
    toastProps: {},
    enableNotification: false,
    notificationState: { list: [] },
    closeNotification: vi.fn(),
    handleNotificationClick: vi.fn(),
  }),
}))

describe('core UIKitProvider viewport variables', () => {
  it('可视高度尚未初始化时不使用零值覆盖主题兜底', () => {
    const host = document.createElement('div')
    const app = createApp({
      render: () => h(CoreUIKitProvider, { enableToast: false }),
    })
    app.mount(host)
    const style = host.querySelector<HTMLElement>('.uikit-provider')!.getAttribute('style') ?? ''

    expect(style).not.toContain('--uikit-visible-height')
    expect(style).not.toContain('--uikit-viewport-offset-top')
    app.unmount()
  })
})
