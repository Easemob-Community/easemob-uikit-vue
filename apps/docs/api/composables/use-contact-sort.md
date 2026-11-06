# useContactSort

按指定规则对联系人进行响应式排序。

## 导入与签名

```ts
import { useContactSort } from '@easemob-community/uikit-im'

const sorted = useContactSort(contacts, sortBy)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `contacts` | `Ref<Contact[]> \| ComputedRef<Contact[]>` | 联系人数据源 |
| `sortBy` | `Ref<ContactSortBy>` | 排序规则 |

## 返回值

返回 `ComputedRef<Contact[]>`。展示名采用备注优先、用户资料昵称其次的回退口径；中文排序可结合 [`usePinyin`](/api/composables/use-pinyin) 注入的适配器。

## 最小用法

```ts
const sortBy = ref('name')
const sortedContacts = useContactSort(contacts, sortBy)
```
