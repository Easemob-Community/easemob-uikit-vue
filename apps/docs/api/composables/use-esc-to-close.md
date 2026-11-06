# useEscToClose

在弹层处于激活状态时，按 Escape 调用关闭回调。

## 导入与签名

```ts
import { useEscToClose } from '@easemob-community/uikit-im'

useEscToClose(active, onClose, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `active` | `MaybeRefOrGetter<boolean>` | 是否响应 Escape |
| `onClose` | `() => void` | 关闭回调 |
| `options.ignoreWhenTyping` | `boolean` | 输入控件聚焦时是否忽略，默认 `false` |
| `options.stopPropagation` | `boolean` | 命中后是否停止事件传播 |

## 最小用法

```ts
useEscToClose(computed(() => props.show), () => {
  emit('update:show', false)
})
```

该函数返回 `void`，事件监听随组件作用域自动清理。
