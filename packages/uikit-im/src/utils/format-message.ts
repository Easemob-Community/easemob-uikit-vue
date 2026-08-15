import { MESSAGE_TYPE } from '@easemob/uikit-core'
import type { MessageTypeValue } from '@easemob/uikit-core'

/** 消息类型 → 摘要文本 的默认映射 */
const MESSAGE_SUMMARY_MAP: Record<string, string> = {}

/**
 * 创建消息摘要格式化函数
 * 非文本消息类型显示占位摘要，文本消息原样返回
 */
export function createMessageFormatter(
  t: (key: string) => string
): (msg: string, type?: string) => string {
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.IMAGE] = t('message.image')
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.VOICE] = t('message.audio')
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.VIDEO] = t('message.video')
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.FILE] = t('message.file')
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.CMD] = t('message.cmd')
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.CUSTOM] = t('message.custom')
  MESSAGE_SUMMARY_MAP[MESSAGE_TYPE.LOCATION] = t('message.location')

  return (msg: string, type?: string): string => {
    if (type && type !== MESSAGE_TYPE.TEXT && MESSAGE_SUMMARY_MAP[type]) {
      return MESSAGE_SUMMARY_MAP[type]
    }
    return msg
  }
}

/**
 * 类型守卫：判断是否为合法的消息类型值
 */
export function isValidMessageType(value: string): value is MessageTypeValue {
  return Object.values(MESSAGE_TYPE).includes(value as MessageTypeValue)
}
