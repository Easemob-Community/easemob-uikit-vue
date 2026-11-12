# useViewport

读取视口尺寸、移动布局、键盘与安全区状态。

## 导入与签名

```ts
import { useViewport } from '@easemob-community/uikit-im'

const viewport = useViewport()
```

## 返回值

返回 `width`、`height`、`visibleHeight`、`viewportOffsetTop`、`isMobile`、`keyboardHeight`、`isKeyboardOpen`、`safeAreaInsets`。

- `height`：布局视口高度，即 `window.innerHeight`。
- `visibleHeight`：实际可视高度，优先取 `window.visualViewport.height`，不支持时回退到 `innerHeight`。
- `viewportOffsetTop`：可视视口相对布局视口顶部的偏移，不支持 `visualViewport` 时为 `0`。
- `keyboardHeight`：用于面板高度对齐，不应再作为全屏页面的底部 padding。

## 最小用法

```ts
const { visibleHeight, viewportOffsetTop, isMobile, safeAreaInsets } = useViewport()
```

Provider 内的全屏页面也可以直接使用 CSS 变量：

```css
.full-screen-h5-page {
  height: 100vh;
  height: var(--uikit-visible-height, 100dvh);
}
```

在 Provider 内复用统一的 H5 适配状态；在 Provider 外降级为本地 resize 监听，`visibleHeight` 使用 `innerHeight`、`viewportOffsetTop` 为 `0`，键盘与安全区字段使用零值。
