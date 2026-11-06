# useTheme

读取并修改 UIKit 主题，包括明暗模式、品牌色、形状、密度、字号和消息区域配色。

## 导入与签名

```ts
import { useTheme } from '@easemob-community/uikit-im'

const theme = useTheme()
```

## 返回值

- **模式与品牌色**：`mode`、`effectiveMode`、`isDark`、`primaryColor`、`primaryColorHsl`。
- **形态**：`avatarShape`、`bubbleShape`、`componentsShape`、`containerGap`、`hoverStyle`。
- **阅读体验**：`fontSizeScale`、`density`、`headerBorder`。
- **消息配色**：`bubbleBgOther`、`bubbleBgSelf`、`chatBg`、`inputBg`、`messageChipBg` 等。
- **设置方法**：`setMode`、`setPrimaryColor`、`setAvatarShape`、`setBubbleShape`、`setFontSize`、`setDensity` 等。

## 最小用法

```ts
const { effectiveMode, setMode, setPrimaryColor, setDensity } = useTheme()
setMode('dark')
setPrimaryColor(203)
setDensity('comfortable')
```

主题通过 `useThemeStore` 持久化并写入 CSS 变量，修改会立即影响组件。
