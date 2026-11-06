# useContactGroup

将联系人按不分组、字母或自定义规则分组，并提供组内排序。

## 导入与签名

```ts
import { useContactGroup } from '@easemob-community/uikit-im'

const groups = useContactGroup(contacts, groupBy, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `contacts` | `Ref<Contact[]> \| ComputedRef<Contact[]>` | 联系人数据源 |
| `groupBy` | `Ref<ContactGroupBy>` | `'none'`、`'alphabet'` 或自定义分组函数 |
| `options.sort` | `(a, b) => number` | 可选，覆盖组内排序 |

## 返回值

返回 `ComputedRef<ContactGroupItem[]>`，每项包含 `key`、`title`、`items`。字母模式按 A–Z 与 `#` 排列并剔除空组；非 A–Z 展示名可通过拼音适配器归类。

## 最小用法

```ts
const groupBy = ref('alphabet')
const contactGroups = useContactGroup(contacts, groupBy)
```
