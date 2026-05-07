import { ref } from 'vue'

export function useLongPress(callback: () => void, delay: number = 600) {
  const timer = ref<ReturnType<typeof setTimeout> | null>(null)
  const isPressing = ref(false)

  function start() {
    isPressing.value = true
    timer.value = setTimeout(() => {
      if (isPressing.value) {
        callback()
        isPressing.value = false
      }
    }, delay)
  }

  function end() {
    isPressing.value = false
    if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }
  }

  function cancel() {
    end()
  }

  return {
    start,
    end,
    cancel,
    isPressing,
  }
}
