# useBottomSheet

为底部面板提供拖拽位移、进度和关闭手势。

## 导入与签名

```ts
import { useBottomSheet } from '@easemob-community/uikit-im'

const sheet = useBottomSheet(target, options)
```

## 参数

- `target`：`Ref<HTMLElement | undefined>`，拖拽目标。
- `options`：`UseBottomSheetOptions`，`dismissThreshold` 默认 `100`，并可配置关闭回调。

## 返回值

返回 `isDragging`、`translateY`、`progress`、`onTouchStart`、`onTouchMove`、`onTouchEnd` 和 `reset`。

## 最小用法

```ts
const target = ref<HTMLElement>()
const { translateY, onTouchStart, onTouchMove, onTouchEnd } = useBottomSheet(target, {
  onDismiss: () => { visible.value = false },
})
```
