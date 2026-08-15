# 主题定制（CSS 变量 / useTheme / 暗色 / 密度 / 字号）

UIKit 提供「CSS 变量 + ThemeStore」双层主题体系，支持品牌色、暗色、组件形态与动画的精细化定制。

## 设计原则

- 视觉参数沉淀为 `--uikit-*` CSS 变量，组件内部只消费变量，不写死颜色
- 运行时通过 `useTheme()` 动态改写变量，无需刷新页面
- 暗色通过 `[data-uikit-theme="dark"]` 属性切换

## 覆盖 CSS 变量（全局）

```css
:root {
  --uikit-primary-color: hsl(262, 100%, 60%); /* 品牌色 */
  --uikit-primary-hover: hsl(262, 100%, 50%);
  --uikit-primary-rgb: 124, 58, 237;          /* 用于 rgba() 半透明 */
  --uikit-components-radius: 0px;             /* 组件圆角 */
  --uikit-anim-enabled: 0;                    /* 关闭动画 */
}
```

也可按容器作用域覆盖：

```css
.support-workspace {
  --uikit-primary-color: hsl(160, 84%, 39%);
}
```

## 变量分组速查

- 品牌/语义色：`--uikit-primary-*`、`--uikit-success-color`、`--uikit-warning-color`、`--uikit-danger-color`、`--uikit-info-color`
- 文字/背景：`--uikit-text-primary/secondary/tertiary`、`--uikit-bg-base/secondary/elevated/hover/active`
- 边框：`--uikit-border-color`、`--uikit-border-light`、`--uikit-divider-color`
- 尺寸/圆角：`--uikit-container-gap`、`--uikit-components-radius`、`--uikit-components-radius-hover`
- 阴影：`--uikit-shadow`、`--uikit-shadow-hover`、`--uikit-shadow-sm`
- 字号：`--uikit-font-scale` + `--uikit-font-size-10` ~ `-22`
- 密度：`[data-uikit-density="compact" | "normal" | "comfortable"]`
- 动画：`--uikit-anim-enabled`、`--uikit-anim-duration*`、`--uikit-anim-easing*`
- 聊天语义：`--uikit-bubble-bg-other/self`、`--uikit-bubble-text-other/self`、`--uikit-chat-bg`、`--uikit-input-bg`

## 暗色模式

```html
<html data-uikit-theme="dark"> ... </html>
```

ThemeStore 支持 `light / dark / auto`，`auto` 跟随系统：

```ts
import { useTheme } from '@easemob/uikit-im'
const { setMode, isDark } = useTheme()
setMode('auto')
```

## 运行时定制（useTheme）

```ts
import { useTheme } from '@easemob/uikit-im'

const {
  primaryColor, avatarShape, bubbleShape, componentsShape,
  fontSizeScale, density, animationEnabled, animationLevel,
  setPrimaryColor, setAvatarShape, setBubbleShape, setComponentsShape,
  setContainerGap, setHoverStyle, setAnimationEnabled, setAnimationLevel,
  setFontSize, setFontSizeScale, setBubbleBg, setChatBg, setInputBg, toggleMode,
} = useTheme()

setPrimaryColor(262)              // 品牌色相 0-360
setAvatarShape('square')          // 'circle' | 'square'
setBubbleShape('square')          // 'ground' | 'square'
setComponentsShape('square')      // 'ground' | 'square'
setContainerGap(12)
setHoverStyle('lift')             // 'none' | 'light' | 'lift'
setFontSize('xlarge')             // 'normal' | 'large' | 'xlarge'
setFontSizeScale(1.25)            // 或直接给缩放倍数
setDensity('compact')             // 'compact' | 'normal' | 'comfortable'
setBubbleBg('#f3f4f6', '#7c3aed') // (对方, 自己)；传 null 重置
setChatBg('url(/chat-bg.png)')
setInputBg('#ffffff')
setAnimationLevel('expressive')   // 'subtle' | 'normal' | 'expressive'
setAnimationEnabled(false)
toggleMode()                      // light / dark / auto
```

## Provider 声明式配置

```vue
<EmUIKitProvider
  app-key="your-app-key"
  :theme="{
    mode: 'dark',
    primaryColor: 262,
    gap: 12,
    shape: 'square',
    fontSize: 'xlarge',
    density: 'compact',
    bubbleColor: { other: '#f3f4f6', self: '#7c3aed' }, // 或直接字符串
    chatBg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    inputBg: '#ffffff',
  }"
>
  <em-conversation-container />
</EmUIKitProvider>
```

## 业务层映射

业务项目可把设计稿 Token 映射到 UIKit 变量，保持多端一致：

```css
:root {
  --uikit-primary-color: var(--brand-500);
  --uikit-bg-base: var(--gray-50);
  --uikit-border-color: var(--gray-200);
}
```
