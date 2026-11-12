import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useH5Adaptation } from '../use-h5-adaptation'

let scope: EffectScope | undefined

function installViewportMock(options?: { visualViewport?: boolean }) {
  const visualViewport = options?.visualViewport === false
    ? undefined
    : Object.assign(new EventTarget(), {
      width: 390,
      height: 800,
      offsetTop: 0,
    })
  const windowMock = Object.assign(new EventTarget(), {
    innerWidth: 390,
    innerHeight: 800,
    visualViewport,
  })
  const documentMock = new EventTarget()

  vi.stubGlobal('window', windowMock)
  vi.stubGlobal('document', documentMock)

  return { windowMock, visualViewport }
}

function mountH5() {
  scope = effectScope()
  return scope.run(() => useH5Adaptation({ safeArea: false, keyboardAdapt: false }))!
}

afterEach(() => {
  scope?.stop()
  scope = undefined
  vi.unstubAllGlobals()
})

describe('useH5Adaptation visual viewport', () => {
  it('同步 visualViewport 的可视高度与顶部偏移，同时保留布局视口高度', () => {
    const { visualViewport } = installViewportMock()
    const h5 = mountH5()

    expect(h5.visibleHeight.value).toBe(800)
    expect(h5.viewportOffsetTop.value).toBe(0)

    visualViewport!.height = 500
    visualViewport!.offsetTop = 24
    visualViewport!.dispatchEvent(new Event('resize'))

    expect(h5.visibleHeight.value).toBe(500)
    expect(h5.viewportOffsetTop.value).toBe(24)
    expect(h5.viewport.height.value).toBe(800)

    visualViewport!.height = 510
    visualViewport!.offsetTop = 12
    visualViewport!.dispatchEvent(new Event('scroll'))

    expect(h5.visibleHeight.value).toBe(510)
    expect(h5.viewportOffsetTop.value).toBe(12)
  })

  it('无 visualViewport 时回退到 innerHeight 和零偏移', () => {
    const { windowMock } = installViewportMock({ visualViewport: false })
    const h5 = mountH5()

    expect(h5.visibleHeight.value).toBe(800)
    expect(h5.viewportOffsetTop.value).toBe(0)

    windowMock.innerHeight = 720
    windowMock.dispatchEvent(new Event('resize'))

    expect(h5.visibleHeight.value).toBe(720)
    expect(h5.viewportOffsetTop.value).toBe(0)
  })
})
