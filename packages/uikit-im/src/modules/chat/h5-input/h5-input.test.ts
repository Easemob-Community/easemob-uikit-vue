// @vitest-environment jsdom
import { createApp, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import H5Input from './h5-input.vue'

let app: ReturnType<typeof createApp> | undefined
let host: HTMLDivElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  vi.restoreAllMocks()
})

function mountInput(props: { keyboardHeight?: number } = {}) {
  const inputRef = ref<InstanceType<typeof H5Input>>()
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () => h(H5Input, {
      ...props,
      ref: inputRef,
      config: { autoFocus: false },
    }),
  })
  app.mount(host)
  return inputRef
}

describe('h5 input focus', () => {
  it('恢复草稿时只设置文本，不聚焦输入框', async () => {
    const inputRef = mountInput()
    const textarea = host!.querySelector<HTMLTextAreaElement>('textarea')!
    const focus = vi.spyOn(textarea, 'focus')

    inputRef.value?.setText('已有草稿', false)
    await nextTick()

    expect(textarea.value).toBe('已有草稿')
    expect(focus).not.toHaveBeenCalled()
  })

  it('主动设置文本时保持聚焦行为', async () => {
    const inputRef = mountInput()
    const textarea = host!.querySelector<HTMLTextAreaElement>('textarea')!
    const focus = vi.spyOn(textarea, 'focus')

    inputRef.value?.setText('重新编辑')
    await nextTick()

    expect(focus).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(textarea)
  })
})

describe('h5 input bottom spacing', () => {
  it('键盘高度不转换成输入根节点的底部 padding', () => {
    mountInput({ keyboardHeight: 320 })
    const root = host!.querySelector<HTMLElement>('.h5-input')!

    expect(root.style.paddingBottom).toBe('')
  })
})
