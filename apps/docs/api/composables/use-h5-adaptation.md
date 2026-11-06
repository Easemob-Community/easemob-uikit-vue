# useH5Adaptation

读取 H5 视口、安全区、键盘和移动端适配状态。

## 导入与签名

```ts
import { useH5Adaptation } from '@easemob-community/uikit-im'

const h5 = useH5Adaptation(config)
```

## 参数

`config` 为可选的 `MaybeRef<H5AdaptationConfig>`，支持安全区、键盘适配、下拉刷新和字号缩放配置。

## 返回值

| 成员 | 说明 |
| --- | --- |
| `config` | 合并默认值后的响应式配置 |
| `viewport` | `width`、`height` |
| `isMobile` | 是否处于移动布局 |
| `safeAreaInsets` | 四向安全区 |
| `keyboardHeight` / `isKeyboardOpen` | 键盘高度与打开状态 |
| `enablePullRefresh` | 是否应启用下拉刷新 |
| `fontScale` | 字号缩放 |

## 最小用法

```ts
const { isMobile, safeAreaInsets, keyboardHeight } = useH5Adaptation({
  keyboardAdapt: true,
})
```

SSR 环境提供安全的初始状态，客户端挂载后更新真实视口信息。
