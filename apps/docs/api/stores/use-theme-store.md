# useThemeStore

持久化管理品牌色、明暗模式、形状、密度、字号和消息配色，并同步到 `--uikit-*` CSS 变量。

## 导入与上下文

```ts
import { useThemeStore } from '@easemob-community/uikit-im'

const store = useThemeStore()
```

## State 与 Getters

| 成员 | 说明 |
| --- | --- |
| `primaryColor` / `primaryColorSat` / `primaryColorLum` | 品牌色相、饱和度、亮度 |
| `mode` / `effectiveMode` | 设置模式与实际明暗模式 |
| `avatarShape` / `bubbleShape` / `componentsShape` | 组件形态 |
| `density` / `fontSizeScale` | 密度与字号缩放 |
| `headerBorder` / `messageChipBg` | 头部边框与消息配色 |

## Actions 与用法

```ts
store.setPrimaryColor(203)
store.setMode('dark')
store.setFontSize('large')
store.setDensity('comfortable')
store.setAvatarShape('square')
```

业务代码通常使用更聚焦的 [`useTheme`](/api/composables/use-theme) 读取和修改主题。
