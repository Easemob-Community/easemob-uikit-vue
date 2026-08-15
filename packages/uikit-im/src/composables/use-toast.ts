import { ref, readonly } from 'vue'

interface ToastState {
  visible: boolean
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

const toastState = ref<ToastState>({
  visible: false,
  message: '',
  type: 'info',
})

let timer: ReturnType<typeof setTimeout> | null = null

function show(message: string, type: ToastState['type'] = 'info', duration: number = 2000) {
  if (timer) clearTimeout(timer)

  toastState.value = { visible: true, message, type }

  timer = setTimeout(() => {
    toastState.value.visible = false
  }, duration)
}

export function useToast() {
  return {
    show,
    success: (msg: string, duration?: number) => show(msg, 'success', duration),
    error: (msg: string, duration?: number) => show(msg, 'error', duration),
    warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
    state: readonly(toastState),
  }
}
