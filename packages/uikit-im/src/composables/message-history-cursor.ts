import { ref } from 'vue'

/** 历史消息游标（模块级单例，保证首屏拉取与上滑加载共享同一份游标） */
const historyCursorMap = ref<Record<string, { cursor: string, isLast: boolean }>>({})

export function getHistoryCursor(conversationId: string) {
  return historyCursorMap.value[conversationId] || { cursor: '', isLast: false }
}

export function setHistoryCursor(conversationId: string, cursor: string, isLast: boolean) {
  historyCursorMap.value[conversationId] = { cursor, isLast }
}

export function clearHistoryCursor(conversationId: string) {
  delete historyCursorMap.value[conversationId]
}
