# useKeyboard

监听移动端软键盘高度与打开状态。

## 导入与签名

```ts
import { useKeyboard } from '@easemob-community/uikit-im'

const keyboard = useKeyboard()
```

## 返回值

返回 `keyboardHeight` 和 `isKeyboardOpen` 两个响应式引用。SSR 环境下分别保持 `0` 和 `false`，客户端根据 `visualViewport` 更新。

## 最小用法

```ts
const { keyboardHeight, isKeyboardOpen } = useKeyboard()
```

输入框布局调整应同时考虑安全区；完整的 H5 状态可使用 [`useH5Adaptation`](/api/composables/use-h5-adaptation)。
