# useKeyBindings

注册一组键盘快捷键，并控制激活状态、输入态忽略和事件传播。

## 导入与签名

```ts
import { useKeyBindings } from '@easemob-community/uikit-im'

useKeyBindings(bindings, options)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `bindings` | `KeyBindingsMap` | — | 组合键到处理函数的映射 |
| `options.active` | `MaybeRefOrGetter<boolean>` | `true` | 是否启用 |
| `options.ignoreWhenTyping` | `boolean` | `true` | 输入时是否忽略 |
| `options.repeat` | `boolean` | `true` | 长按重复是否持续触发 |
| `options.stopPropagation` | `boolean` | `false` | 是否停止传播 |
| `options.preventDefault` | `boolean` | `false` | 是否阻止默认行为 |

## 最小用法

```ts
useKeyBindings({
  Escape: close,
  'Ctrl+K': openSearch,
}, { active: computed(() => enabled.value) })
```

该函数返回 `void`，监听随激活状态和组件作用域自动绑定、解绑。
