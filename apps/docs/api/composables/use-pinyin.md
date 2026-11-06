# usePinyin

管理可选拼音适配器，用于联系人和群组的拼音筛选、分组与排序。

## 导入与签名

```ts
import { usePinyin } from '@easemob-community/uikit-im'

const pinyin = usePinyin()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `setPinyinAdapter(adapter)` | 注入或清除 `PinyinAdapter` |
| `hasPinyinAdapter()` | 是否已注入适配器 |
| `resolvePinyin(text)` | 返回 `PinyinResult \| null` |
| `clearPinyinCache()` | 清除解析缓存 |

## 最小用法

```ts
const { setPinyinAdapter, resolvePinyin } = usePinyin()

setPinyinAdapter(adapter)
const result = resolvePinyin('张三')
```

UIKit 不强制绑定具体拼音库；未注入适配器时筛选与排序回退到原文。
