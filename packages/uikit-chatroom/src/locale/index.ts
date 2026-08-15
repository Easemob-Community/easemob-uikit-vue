import { mergeLocaleMessages } from '@easemob/uikit-core'
import zhCN from './zh-CN'
import en from './en'

/**
 * 聊天室场景 locale：模块加载时经 core `mergeLocaleMessages` 并入（同 key 后者覆盖，
 * chatroom.* 前缀段与 core/IM 文案不冲突）；合并即时生效，切换语言走 core 的
 * currentLocale 响应式链路。包入口（src/index.ts）会 import 本模块触发合并。
 */
mergeLocaleMessages('zh-CN', zhCN)
mergeLocaleMessages('en', en)

export { zhCN as chatroomLocaleZhCN, en as chatroomLocaleEn }
