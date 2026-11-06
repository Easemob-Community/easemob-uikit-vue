# useResizable

通过拖拽手柄调整区域尺寸，并提供拖拽与触摸状态。

## 导入与签名

```ts
import { useResizable } from '@easemob-community/uikit-im'

const resizable = useResizable(handleRef, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `handleRef` | `Ref<HTMLElement \| undefined>` | 拖拽手柄 |
| `options` | `UseResizableOptions` | `axis`、`min`、`max`、`initial` 等配置 |

`min` 默认 `0`，`max` 默认正无穷，`initial` 默认 `200`。

## 返回值

返回 `size`、`isResizing`、`touched`。

## 最小用法

```ts
const handleRef = ref<HTMLElement>()
const { size, isResizing } = useResizable(handleRef, {
  axis: 'x', min: 240, max: 560, initial: 320,
})
```
