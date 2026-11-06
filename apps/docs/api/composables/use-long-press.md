# useLongPress

为触摸或指针交互提供长按手势状态与事件。

## 导入与签名

```ts
import { useLongPress } from '@easemob-community/uikit-im'

const gesture = useLongPress(callback, options)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `callback` | `() => void` | — | 达到长按时长后触发 |
| `options.delay` | `number` | `600` | 长按时长（ms） |
| `options.moveThreshold` | `number` | `10` | 允许移动距离 |
| `options.preventScroll` | `boolean` | `true` | 是否阻止长按过程滚动 |
| `options.onStart` / `onEnd` | 回调 | — | 手势开始与结束 |

## 返回值

返回 `start`、`move`、`end`、`cancel` 事件处理器和 `isPressing` 状态。

## 最小用法

```ts
const { start, move, end, isPressing } = useLongPress(() => {
  openMessageActions()
})
```
