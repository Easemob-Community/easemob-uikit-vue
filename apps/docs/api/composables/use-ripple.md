# useRipple

在指定元素的 `pointerdown` 上启用涟漪反馈，并在组件卸载时清理监听。

## 导入与签名

```ts
import { useRipple } from '@easemob-community/uikit-im'

useRipple(el, options)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `el` | `Ref<HTMLElement \| undefined>` | — | 触发涟漪的元素 |
| `options` | `RippleOptions` | `{}` | 涟漪行为配置 |
| `options.autoRemove` | `boolean` | `true` | 动画结束后自动移除节点 |

## 最小用法

```ts
const buttonRef = ref<HTMLElement>()
useRipple(buttonRef)
```

该函数返回 `void`，涟漪生命周期由 composable 和元素动画事件共同管理。
