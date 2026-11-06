# useGroupFilter

按群名称、群 ID、拼音或首字母实时筛选群组。

## 导入与签名

```ts
import { useGroupFilter } from '@easemob-community/uikit-im'

const filtered = useGroupFilter(groups, keyword, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `groups` | `Ref<Group[]> \| ComputedRef<Group[]>` | 群组数据源 |
| `keyword` | `Ref<string>` | 筛选关键字 |
| `options.filterFn` | `(keyword, group) => boolean` | 可选，覆盖默认规则 |

## 返回值

返回 `ComputedRef<Group[]>`。空关键字返回原列表；拼音与首字母匹配仅在已注入拼音适配器时生效。

## 最小用法

```ts
const keyword = ref('yun')
const filteredGroups = useGroupFilter(groups, keyword)
```
