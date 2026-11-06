import { mergeLocaleMessages } from '@easemob-community/uikit-core'
import zhCN from './zh-CN'
import en from './en'

mergeLocaleMessages('zh-CN', zhCN)
mergeLocaleMessages('en', en)

export { zhCN as imLocaleZhCN, en as imLocaleEn }
