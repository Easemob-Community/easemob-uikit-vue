# useViewport

读取视口尺寸、移动布局、键盘与安全区状态。

## 导入与签名

```ts
import { useViewport } from '@easemob-community/uikit-im'

const viewport = useViewport()
```

## 返回值

返回 `width`、`height`、`isMobile`、`keyboardHeight`、`isKeyboardOpen`、`safeAreaInsets`。

## 最小用法

```ts
const { width, isMobile, safeAreaInsets } = useViewport()
```

在 Provider 内复用统一的 H5 适配状态；在 Provider 外降级为本地 resize 监听，键盘与安全区字段使用零值。
