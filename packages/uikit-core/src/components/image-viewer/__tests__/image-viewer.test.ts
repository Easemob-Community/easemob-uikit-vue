// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
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

    const button = host.querySelector<HTMLButtonElement>('button[aria-label="关闭"]')
    expect(button).not.toBeNull()

    button!.click()
    await nextTick()

    expect(show.value).toBe(false)
    expect(close).toHaveBeenCalledOnce()
    expect(host.querySelector('.image-viewer')).toBeNull()
  })

  it('关闭按钮颜色与圆角使用主题 token', async () => {
    const source = await readFile('src/components/image-viewer/image-viewer.vue', 'utf8')

    expect(source).toContain('border-radius: var(--uikit-image-viewer-control-radius);')
    expect(source).toContain('background-color: var(--uikit-image-viewer-control-bg);')
    expect(source).toContain('background-color: var(--uikit-image-viewer-control-bg-hover);')
  })
})
