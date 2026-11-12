// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createApp, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageViewer from '../image-viewer.vue'

let app: ReturnType<typeof createApp> | undefined
let host: HTMLDivElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
})

describe('imageViewer', () => {
  it('提供可访问的关闭按钮，点击后同步关闭状态', async () => {
    const show = ref(true)
    const close = vi.fn()
    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({
      render: () => h(ImageViewer, {
        'show': show.value,
        'onUpdate:show': (value: boolean) => show.value = value,
        'onClose': close,
        'srcs': ['/image.jpg'],
      }),
    })
    app.mount(host)
    await nextTick()

    const button = document.body.querySelector<HTMLButtonElement>('button[aria-label="关闭"]')
    expect(button).not.toBeNull()

    button!.click()
    await nextTick()

    expect(show.value).toBe(false)
    expect(close).toHaveBeenCalledOnce()
    expect(document.body.querySelector('.image-viewer')).toBeNull()
  })

  it('关闭按钮颜色与圆角使用主题 token', async () => {
    const source = await readFile(resolve(__dirname, '../image-viewer.vue'), 'utf8')

    expect(source).toContain('border-radius: var(--uikit-image-viewer-control-radius);')
    expect(source).toContain('background-color: var(--uikit-image-viewer-control-bg);')
    expect(source).toContain('background-color: var(--uikit-image-viewer-control-bg-hover);')
  })

  it('h5 预览层跟随可视视口并约束图片高度', async () => {
    const source = await readFile(resolve(__dirname, '../image-viewer.vue'), 'utf8')

    expect(source).toContain('top: var(--uikit-viewport-offset-top, 0px);')
    expect(source).toContain('height: var(--uikit-visible-height, 100dvh);')
    expect(source).toContain('max-height: 90%;')
  })

  it('预览层挂载到 body，脱离宿主裁剪与层叠上下文', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({
      render: () => h(ImageViewer, {
        show: true,
        srcs: ['/image.jpg'],
      }),
    })
    app.mount(host)
    await nextTick()

    const viewer = document.body.querySelector('.image-viewer')
    expect(viewer?.parentElement).toBe(document.body)
    expect(host.querySelector('.image-viewer')).toBeNull()
    expect(viewer?.querySelector('.image-viewer__toolbar')).not.toBeNull()
  })

  it('teleport 后仍响应 Provider 的可视视口高度与偏移', async () => {
    const { CORE_UIKIT_CONTEXT_KEY } = await import('../../../composables/use-uikit')
    const visibleHeight = ref(500)
    const viewportOffsetTop = ref(24)
    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({
      render: () => h(ImageViewer, {
        show: true,
        srcs: ['/image.jpg'],
      }),
    })
    app.provide(CORE_UIKIT_CONTEXT_KEY, {
      h5: {
        viewport: { width: ref(393), height: ref(852) },
        visibleHeight,
        viewportOffsetTop,
        isMobile: ref(true),
        keyboardHeight: ref(0),
        isKeyboardOpen: ref(false),
        safeAreaInsets: ref({ top: 0, right: 0, bottom: 0, left: 0 }),
      },
    } as unknown as import('../../../composables/use-uikit').CoreUIKitContext)
    app.mount(host)
    await nextTick()

    const viewer = document.body.querySelector<HTMLElement>('.image-viewer')!
    expect(viewer.style.getPropertyValue('--uikit-visible-height')).toBe('500px')
    expect(viewer.style.getPropertyValue('--uikit-viewport-offset-top')).toBe('24px')

    visibleHeight.value = 420
    viewportOffsetTop.value = 12
    await nextTick()
    expect(viewer.style.getPropertyValue('--uikit-visible-height')).toBe('420px')
    expect(viewer.style.getPropertyValue('--uikit-viewport-offset-top')).toBe('12px')
  })

  it('provider 外打开预览不警告缺少上下文', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    host = document.createElement('div')
    document.body.appendChild(host)
    try {
      app = createApp({
        render: () => h(ImageViewer, {
          show: true,
          srcs: ['/image.jpg'],
        }),
      })
      app.mount(host)
      await nextTick()

      expect(warn).not.toHaveBeenCalled()
    }
    finally {
      warn.mockRestore()
    }
  })
})
