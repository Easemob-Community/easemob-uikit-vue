import { ref, readonly } from 'vue'

export type ToastType = 'info' | 'success' | 'error' | 'warning'
export type ToastPosition = 'top' | 'center' | 'bottom'

export interface ToastShowOptions {
  /** 提示类型 */
  type?: ToastType
  /** 自动关闭延时（ms），默认 2000；传 0 表示不自动关闭 */
  duration?: number
  /** 是否显示手动关闭按钮 */
  closable?: boolean
  /** 位置：top / center（默认）/ bottom */
  position?: ToastPosition
  /** 操作按钮文案；传入时显示在消息下方 */
  actionText?: string
  /** 点击操作按钮后的回调 */
  onAction?: () => void
}

interface ToastState {
  visible: boolean
  message: string
  type: ToastType
  duration: number
  closable: boolean
  position: ToastPosition
  actionText: string
  onAction: (() => void) | undefined
}

const toastState = ref<ToastState>({
  visible: false,
  message: '',
  type: 'info',
  duration: 2000,
  closable: false,
  position: 'center',
  actionText: '',
  onAction: undefined,
})

let timer: ReturnType<typeof setTimeout> | null = null

function resolveOptions(
  typeOrOptions?: ToastType | ToastShowOptions,
  duration?: number,
): Required<Pick<ToastState, 'type' | 'duration'>> & Omit<ToastShowOptions, 'type' | 'duration'> {
  if (typeof typeOrOptions === 'string') {
    return {
      type: typeOrOptions,
      duration: duration ?? 2000,
    }
  }
  return {
    type: typeOrOptions?.type ?? 'info',
    duration: typeOrOptions?.duration ?? duration ?? 2000,
    closable: typeOrOptions?.closable,
    position: typeOrOptions?.position,
    actionText: typeOrOptions?.actionText,
    onAction: typeOrOptions?.onAction,
  }
}

function show(message: string, type?: ToastType, duration?: number): void
function show(message: string, options?: ToastShowOptions): void
function show(message: string, typeOrOptions?: ToastType | ToastShowOptions, duration?: number) {
  if (timer) clearTimeout(timer)

  const options = resolveOptions(typeOrOptions, duration)

  toastState.value = {
    visible: true,
    message,
    type: options.type,
    duration: options.duration,
    closable: options.closable ?? false,
    position: options.position ?? 'center',
    actionText: options.actionText ?? '',
    onAction: options.onAction,
  }

  if (options.duration > 0) {
    timer = setTimeout(() => {
      toastState.value.visible = false
    }, options.duration)
  }
}

function hide() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  toastState.value.visible = false
}

export function useToast() {
  return {
    show,
    hide,
    success: (msg: string, duration?: number) => show(msg, 'success', duration),
    error: (msg: string, duration?: number) => show(msg, 'error', duration),
    warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
    state: readonly(toastState),
  }
}
