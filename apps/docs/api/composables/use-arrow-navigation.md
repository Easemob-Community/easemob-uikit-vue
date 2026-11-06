# useArrowNavigation

为列表或菜单提供方向键导航与激活索引。

## 导入与签名

```ts
import { useArrowNavigation } from '@easemob-community/uikit-im'

const navigation = useArrowNavigation(options)
```

## 参数

`options` 为 `UseArrowNavigationOptions`：

- `count`：列表项数量，支持响应式值。
- `active`：是否启用，默认 `true`。
- `wrap`：边界是否回绕，默认 `true`。
- `initial`：初始索引，默认 `0`。
- 可配置长按重复和方向行为。

## 返回值

返回 `activeIndex`、`move`、`next`、`prev`、`setIndex`、`reset`。

## 最小用法

```ts
const { activeIndex, next, prev } = useArrowNavigation({
  count: computed(() => items.value.length),
})
```
