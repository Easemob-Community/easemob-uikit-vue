# 主题定制

UIKit 提供「CSS 变量 + ThemeStore」双层主题体系，支持品牌色、暗色模式、组件形态与动画级别的精细化定制。

## 设计原则

- 所有视觉参数沉淀为 `--uikit-*` CSS 变量，组件内部只消费变量，不写死颜色
- 运行时通过 Pinia `ThemeStore` 动态改写变量，无需刷新页面
- 暗色模式通过 `[data-uikit-theme="dark"]` 属性切换，与组件树解耦

## CSS 变量

### 品牌色与语义色

- `--uikit-primary-color`：主品牌色，默认 `hsl(203, 100%, 60%)` 环信蓝
- `--uikit-primary-hover`：主色 hover 态
- `--uikit-primary-rgb`：主色 RGB 三元组（用于 `rgba()` 半透明背景）
- `--uikit-success-color`：成功色
- `--uikit-warning-color`：警告色
- `--uikit-danger-color`：危险色
- `--uikit-info-color`：信息色

### 文字与背景层级

- `--uikit-text-primary`：主要文字（浅色 `#111827` / 暗色 `#f9fafb`）
- `--uikit-text-secondary`：次要文字
- `--uikit-text-tertiary`：三级文字（占位符等）
- `--uikit-bg-base`：页面基础背景
- `--uikit-bg-secondary`：次级背景（列表、卡片）
- `--uikit-bg-elevated`：浮层背景（弹窗、抽屉）
- `--uikit-bg-hover`：hover 背景
- `--uikit-bg-active`：按下 / 选中背景

### 边框与分割线

- `--uikit-border-color`：常规边框
- `--uikit-border-light`：浅边框
- `--uikit-divider-color`：分割线

### 尺寸与圆角

- `--uikit-container-gap`：容器间距（默认 8px）
- `--uikit-components-radius`：组件圆角（默认 8px）
- `--uikit-components-radius-hover`：hover 圆角（默认 14px）
- `--uikit-popup-padding`：弹出层内边距

### 阴影

- `--uikit-shadow`：常规阴影
- `--uikit-shadow-hover`：hover / 浮起阴影
- `--uikit-shadow-sm`：轻量小阴影（卡片/抽屉内）

### 字号

字号 token 与 `--uikit-font-scale` 联动，用于实现全局字号缩放（适老版）：

- `--uikit-font-scale`：全局字号缩放倍数（默认 `1`）
- `--uikit-font-size-10` ~ `--uikit-font-size-22`：按像素基准 × 缩放倍数计算

### 密度

密度档变量（默认 `normal`），覆盖 Cell 高度、内边距、列表间距、Header 内边距、输入区、气泡、抽屉与按钮等尺寸：

- `[data-uikit-density="compact"]`：紧凑档
- `[data-uikit-density="normal"]`：标准档（默认）
- `[data-uikit-density="comfortable"]`：宽松档

### 动画

- `--uikit-anim-enabled`：全局动画开关（1 / 0）
- `--uikit-anim-duration` / `--uikit-anim-duration-enter` / `--uikit-anim-duration-leave`：时长
- `--uikit-anim-easing` 系列：缓动曲线
- `--uikit-anim-scale-press`：按压缩放比
- `--uikit-anim-ripple-*`：Ripple 波纹
- `--uikit-anim-stagger-delay`：列表交错动画

### 聊天语义 token

- `--uikit-bubble-bg-other`：对方气泡背景（默认 `--uikit-bg-secondary`）
- `--uikit-bubble-bg-self`：自己气泡背景（默认 `--uikit-primary-color`）
- `--uikit-bubble-text-other`：对方气泡文字（默认 `--uikit-text-primary`）
- `--uikit-bubble-text-self`：自己气泡文字（默认 `#fff`）
- `--uikit-chat-bg`：聊天背景（默认 `--uikit-bg-base`，使用 `background` 简写，支持颜色/渐变/图片）
- `--uikit-input-bg`：输入区背景（默认 `--uikit-bg-base`）

## 主题演练场

下面的演示面板可以实时调整品牌色、组件圆角、字号档位（适老）与密度档位，直接在右侧会话列表上预览效果（覆盖已落地的 token 面：`--uikit-primary-*` / `--uikit-components-radius` / `--uikit-font-scale` / `data-uikit-density`）：

<demo src="./demo/theme-playground.vue" title="主题 token 演练场" desc="左侧面板调整品牌色相、圆角、字号与密度，右侧会话列表实时生效；调整仅作用于演练场舞台，不写入全局主题。" />

## 覆盖变量

在项目样式表中覆盖 `:root` 即可全局生效：

```css
:root {
  /* 品牌色改为紫色 */
  --uikit-primary-color: hsl(262, 100%, 60%);
  --uikit-primary-hover: hsl(262, 100%, 50%);
  --uikit-primary-rgb: 124, 58, 237;

  /* 圆角体系改为直角 */
  --uikit-components-radius: 0px;
  --uikit-components-radius-hover: 4px;

  /* 关闭动画 */
  --uikit-anim-enabled: 0;
}
```

也可以只针对某个容器作用域覆盖（如客服工作台使用独立品牌色）：

```css
.support-workspace {
  --uikit-primary-color: hsl(160, 84%, 39%);
  --uikit-primary-rgb: 16, 185, 129;
}
```

## 暗色模式

UIKit 暗色主题通过 `[data-uikit-theme="dark"]` 属性驱动，所有组件自动切换：

```html
<html data-uikit-theme="dark">
  ...
</html>
```

### 跟随系统

ThemeStore 支持 `light / dark / auto` 三种模式，`auto` 跟随系统 `prefers-color-scheme`：

```ts
import { useTheme } from '@easemob/uikit'

const { setMode, isDark } = useTheme()

// 跟随系统
setMode('auto')
```

## 运行时定制

通过 `useTheme()` 组合式函数可以在运行时动态调整主题：

```ts
import { useTheme } from '@easemob/uikit'

const {
  primaryColor,
  avatarShape,
  bubbleShape,
  componentsShape,
  containerGap,
  hoverStyle,
  animationEnabled,
  animationLevel,
  fontSizeScale,
  density,
  setPrimaryColor,
  setAvatarShape,
  setBubbleShape,
  setComponentsShape,
  setContainerGap,
  setHoverStyle,
  setAnimationEnabled,
  setAnimationLevel,
  setFontSize,
  setFontSizeScale,
  setBubbleBg,
  setChatBg,
  setInputBg,
  toggleMode,
} = useTheme()

// 按品牌色相环调整主色（0-360）
setPrimaryColor(262)

// 头像 / 气泡 / 组件圆角形态：'circle' | 'square' / 'ground' | 'square'
setAvatarShape('square')
setBubbleShape('square')
setComponentsShape('square')

// 容器间距与 hover 风格
setContainerGap(12)
setHoverStyle('lift') // 'none' | 'light' | 'lift'

// 字号：标准 / 大 / 特大（适老版）
setFontSize('xlarge')
// 或直接指定缩放倍数
setFontSizeScale(1.25)

// 密度：紧凑 / 标准 / 宽松（信息密度控制）
setDensity('compact') // 'compact' | 'normal' | 'comfortable'

// 气泡色、聊天背景、输入区背景
setBubbleBg('#f3f4f6', '#7c3aed')
setBubbleBg(null) // 传 null 重置为默认主题色
setChatBg('url(/chat-bg.png)')
setInputBg('#ffffff')

// 动画：subtle / normal / expressive
setAnimationLevel('expressive')
setAnimationEnabled(false)

// 一键切换 light / dark / auto
toggleMode()
```

## Provider 声明式配置

使用 `EmUIKitProvider` 时，可以通过 `theme` prop 在模板中声明式配置，无需写 JS：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :theme="{
      mode: 'dark',
      primaryColor: 262,
      gap: 12,
      shape: 'square',
      fontSize: 'xlarge', // 'normal' | 'large' | 'xlarge' 或具体倍数
      density: 'compact', // 'compact' | 'normal' | 'comfortable'
      bubbleColor: { other: '#f3f4f6', self: '#7c3aed' },
      chatBg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      inputBg: '#ffffff',
    }"
  >
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

`bubbleColor` 也支持传字符串同时设置自己/对方：`bubbleColor: '#7c3aed'`。`chatBg` 支持颜色、渐变或 `url(...)` 图片背景。

## 在线代码演练场

编辑下面的代码即可实时预览主题效果（右侧预览随代码编译即时更新，点「重置代码」恢复初始模板），体验与在线 IDE 一致：

<VuePlayground :files="themePlaygroundFiles" title="主题配置在线演练场" id="theme" />

## 业务层映射

业务项目可以在自己的样式表中把设计稿 Token 映射到 UIKit 变量，保持多端视觉一致：

```css
:root {
  /* 例如：把设计稿的 Brand/500 映射为主色 */
  --uikit-primary-color: var(--brand-500);
  --uikit-bg-base: var(--gray-50);
  --uikit-border-color: var(--gray-200);
}
```

## 与文档站主题的关系

本文档站（VitePress）的 `--vp-c-brand-*` 变量已映射到 UIKit 品牌蓝，因此暗色模式下文档站与组件视觉保持一致，具体样式见 `.vitepress/theme/style.css`。

<script setup>
import { themePlaygroundFiles } from '../.vitepress/components/playground-files/theme'
</script>
