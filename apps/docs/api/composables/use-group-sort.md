# useGroupSort

按指定规则对群组进行响应式排序。

## 导入与签名

```ts
import { useGroupSort } from '@easemob-community/uikit-im'

const sorted = useGroupSort(groups, sortBy)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `groups` | `Ref<Group[]> \| ComputedRef<Group[]>` | 群组数据源 |
| `sortBy` | `Ref<GroupSortBy>` | 排序规则 |

## 返回值

返回 `ComputedRef<Group[]>`。排序会随数据源或排序规则变化自动重算；中文名称可结合拼音适配器获得字典序。

## 最小用法

```ts
const sortBy = ref('name')
const sortedGroups = useGroupSort(groups, sortBy)
```
