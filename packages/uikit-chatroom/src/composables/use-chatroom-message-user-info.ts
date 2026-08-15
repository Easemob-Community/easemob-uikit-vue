import { computed } from 'vue'
import {
  getChatroomMessageUserInfoConfig,
  setChatroomMessageUserInfoConfig,
} from '../config/message-user-info'
import type { MessageUserInfoConfig } from '../config/message-user-info'

/**
 * 消息 ext 用户信息配置（P4 review 需求 3）：hook 动态设置/读取。
 * Provider 静态配置（useChatroomProvider options.messageUserInfo）之外的
 * 动态入口——业务可按房间/时间段切换（如开播前用 userInfo 服务、
 * 开播后用 ext 通道）。
 */
export function useChatroomMessageUserInfo() {
  const config = computed(() => getChatroomMessageUserInfoConfig())

  /** 动态设置配置（部分字段缺省用默认 key） */
  function setConfig(next: MessageUserInfoConfig) {
    setChatroomMessageUserInfoConfig(next)
  }

  return {
    config,
    setConfig,
  }
}
