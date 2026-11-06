# useContactFilter

按展示名、用户 ID、拼音或首字母实时筛选联系人。

## 导入与签名

```ts
import { useContactFilter } from '@easemob-community/uikit-im'

const filtered = useContactFilter(contacts, keyword, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `contacts` | `Ref<Contact[]> \| ComputedRef<Contact[]>` | 联系人数据源 |
| `keyword` | `Ref<string>` | 筛选关键字 |
| `options.filterFn` | `(keyword, contact) => boolean` | 可选，覆盖默认筛选规则 |

## 返回值

返回 `ComputedRef<Contact[]>`。默认匹配备注/昵称/name、userId，以及已配置拼音适配器时的完整拼音和首字母；昵称回填后自动重算。

## 最小用法

```ts
const keyword = ref('zhang')
const filteredContacts = useContactFilter(contacts, keyword)
```
