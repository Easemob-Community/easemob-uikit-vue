# useToast

显示、隐藏和读取 UIKit 全局轻提示。

## 导入与签名

```ts
import { useToast } from '@easemob-community/uikit-im'

const toast = useToast()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `show(message, typeOrOptions?, duration?)` | 显示提示，支持类型或完整选项 |
| `hide()` | 隐藏当前提示 |
| `success(msg, duration?)` / `error(...)` / `warning(...)` | 语义化快捷方法 |
| `state` | 只读的可见性、文案、类型、时长、位置和操作配置 |

## 最小用法

```ts
const { success, error } = useToast()
success('已保存')
error('发送失败，请重试', 3000)
```

`duration` 默认 2000ms；传 `0` 可保持显示，后续由 `hide()` 关闭。
