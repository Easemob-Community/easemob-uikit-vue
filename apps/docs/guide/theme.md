# 主题定制

UIKit 提供「CSS 变量 + ThemeStore」双层主题体系，支持品牌色、暗色模式、组件形态与动画级别的精细化定制。

## 设计原则

UIKit 设计系统遵循以下核心原则，作为模糊场景下的决策依据：

1. **变量优先，不写死视觉值**
   所有颜色、间距、字号、圆角、动效等视觉参数必须沉淀为 `--uikit-*` CSS 变量；组件内部只消费变量，禁止硬编码色值或尺寸。业务定制时优先覆盖变量，而非覆盖组件样式。

2. **层级清晰，一眼可辨**
   通过背景层级（`bg-base` / `bg-secondary` / `bg-elevated`）与文字层级（`text-primary` / `text-secondary` / `text-tertiary`）建立信息层级；浮层、抽屉、弹窗必须比内容层更靠近用户，z-index 按规范区间分配。

3. **无障碍是默认值**
   所有可交互元素必须支持键盘焦点环（`:focus-visible`）；颜色组合需满足 WCAG 2.1 AA 对比度；动画需尊重 `prefers-reduced-motion`，全局可一键关闭。

4. **移动端优先，渐进增强**
   触控目标不小于 44×44px；H5 场景下长按、手势、安全区、软键盘等能力默认可用；桌面端在宽屏下自然扩展为双栏布局，不破坏移动端体验。

5. **一致优于花哨**
   同一类交互使用同一套 token 与组件形态；危险操作统一使用 danger 语义；空态、加载、错误等边界状态使用统一模板，减少用户认知成本。

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

### 间距阶梯

UIKit 使用 7 级间距 token，覆盖从图标级紧凑留白到页面级大间距：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--uikit-spacing-1` | 4px | 图标/微元素间距、紧凑内边距 |
| `--uikit-spacing-2` | 8px | 组件内小间距（容器 gap、列表 gap、气泡间距、按钮/输入框 padding） |
| `--uikit-spacing-3` | 12px | 组件内常规间距（Cell padding-y、Header padding-y、消息间距） |
| `--uikit-spacing-4` | 16px | 组件间间距（消息内边距、Drawer padding、Card 间距） |
| `--uikit-spacing-5` | 24px | 区块间间距 |
| `--uikit-spacing-6` | 32px | 页面级间距 |
| `--uikit-spacing-7` | 48px | 大页面间距 |

密度档（`data-uikit-density`）会缩放具体组件尺寸变量（如 `--uikit-list-gap`、`--uikit-cell-padding-y`），而这些变量底层已映射到间距阶梯，保证同一密度下留白比例一致。

### 尺寸与圆角

- `--uikit-container-gap`：容器间距（默认 `--uikit-spacing-2`）
- `--uikit-components-radius`：组件圆角（默认 8px）
- `--uikit-components-radius-hover`：hover 圆角（默认 14px）
- `--uikit-popup-padding`：弹出层内边距（默认 4px，hover/展开态 8px），用于 Popup / 菜单 / 表情面板等浮层内容与边界的留白

### 阴影

- `--uikit-shadow`：常规阴影
- `--uikit-shadow-hover`：hover / 浮起阴影
- `--uikit-shadow-sm`：轻量小阴影（卡片/抽屉内）

### 字号

字号 token 与 `--uikit-font-scale` 联动，用于实现全局字号缩放（适老版）：

- `--uikit-font-scale`：全局字号缩放倍数（默认 `1`）
- `--uikit-font-size-10` ~ `--uikit-font-size-22`：按像素基准 × 缩放倍数计算

### 字重与行高

- `--uikit-font-weight-regular`：400（正文）
- `--uikit-font-weight-medium`：500（强调）
- `--uikit-font-weight-semibold`：600（小标题）
- `--uikit-font-weight-bold`：700（大标题）
- `--uikit-font-lineheight-tight`：1.25（标题/紧凑）
- `--uikit-font-lineheight-normal`：1.5（正文）
- `--uikit-font-lineheight-relaxed`：1.75（宽松说明）

### 排版层级

| 层级 | Token（字号） | 行高 | 字重 | 颜色 | 用途 |
| --- | --- | --- | --- | --- | --- |
| Display | `--uikit-font-size-22` | `--uikit-font-lineheight-tight` | 600 | `text-primary` | 页面大标题、空态主文案 |
| H1 | `--uikit-font-size-20` | `--uikit-font-lineheight-tight` | 600 | `text-primary` | 弹窗标题、模块标题 |
| H2 | `--uikit-font-size-18` | `--uikit-font-lineheight-tight` | 600 | `text-primary` | 卡片标题、抽屉标题 |
| H3 | `--uikit-font-size-16` | `--uikit-font-lineheight-normal` | 600 | `text-primary` | 列表分组标题、小标题 |
| H4 | `--uikit-font-size-15` | `--uikit-font-lineheight-normal` | 500 | `text-primary` | 单元格主标题 |
| Body-L | `--uikit-font-size-16` | `--uikit-font-lineheight-normal` | 400 | `text-primary` | 正文大字号（H5 输入框规避 iOS 缩放） |
| Body-M | `--uikit-font-size-14` | `--uikit-font-lineheight-normal` | 400 | `text-primary` | 默认正文 |
| Body-S | `--uikit-font-size-13` | `--uikit-font-lineheight-normal` | 400 | `text-secondary` | 辅助说明、时间戳 |
| Caption | `--uikit-font-size-12` | `--uikit-font-lineheight-relaxed` | 400 | `text-tertiary` | 标签、提示、错误文案 |
| Overline | `--uikit-font-size-10` | `--uikit-font-lineheight-normal` | 500 | `text-tertiary` | 徽标数字、极小标签 |

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

### 动效演练场

下面的面板可实时开关动画、切换强度等级，并演示入场/离场过渡、四种缓动曲线、Ripple 波纹与按压缩放反馈。所有调整仅作用于本舞台，通过 `data-uikit-anim-level` 与 `data-uikit-anim-enabled` 局部生效，不污染全局主题。

<demo src="./demo/animation-playground.vue" title="动效可视化面板" desc="左侧控制动画开关与强度，右侧实时预览 fade-scale、四种 easing、Ripple 与 scale-press 效果。" />

### z-index 层级

UIKit 全局 z-index 分配遵循「通知/Toast 最上层 > 弹层容器 > 浮层小部件 > 内容」的层级关系，避免多浮层叠加时互相遮挡：

| 层级 | 组件 / 场景 | 默认值 | 说明 |
| --- | --- | --- | --- |
| 9999 | Toast、NotificationContainer | 固定 | 全局通知与轻提示，始终位于最顶层 |
| 2000+ | Popup、Modal、ActionSheet、ImageViewer、Drawer | `nextZIndex()` 递增 | 所有居中/底部/侧边弹层共用 Popup 基座，打开时从 2000 开始递增 |
| 10 | ScrollToTop | 固定 | 回到顶部按钮 |
| 1 / 0 | Cell、Resizable、ImageViewer 内容区等 | 固定 | 普通内容/局部定位 |

> Drawer、Popover、Tooltip 等锚定型浮层在 UIKit 中均通过 `Popup` 实现，因此共享 2000+ 递增区间；业务侧如需强制置顶，可显式传入 `z-index` prop。

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

### 对比度验证

暗色模式文字与背景组合已按 WCAG 2.1 AA 标准验证（正文 ≥4.5:1，大文字 ≥3:1）：

| 文字色 \ 背景 | `bg-base` (#111827) | `bg-secondary` (#1f2937) | `bg-elevated` (#1f2937) | 结果 |
| --- | --- | --- | --- | --- |
| `text-primary` (#f9fafb) | 16.98:1 | 14.05:1 | 14.05:1 | PASS AA |
| `text-secondary` (#9ca3af) | 6.99:1 | 5.78:1 | 5.78:1 | PASS AA |
| `text-tertiary` (#8a92a0) | 5.66:1 | 4.68:1 | 4.68:1 | PASS AA |

> 三级文字在暗色下已由 `#6b7280` 提亮为 `#8a92a0`，确保在次级/浮层背景上达到正文可读标准。

### 跟随系统

ThemeStore 支持 `light / dark / auto` 三种模式，`auto` 跟随系统 `prefers-color-scheme`：

```ts
import { useTheme } from '@easemob/uikit-im'

const { setMode, isDark } = useTheme()

// 跟随系统
setMode('auto')
```

## 运行时定制

通过 `useTheme()` 组合式函数可以在运行时动态调整主题：

```ts
import { useTheme } from '@easemob/uikit-im'

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
  preset,
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
  setPreset,
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

// 预设主题：一键切换整套风格（'default' | 'business' | 'fresh'）
setPreset('business')

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

### 预设主题

UIKit 内置 3 套预设主题档位，`setPreset()` 一键切换整套风格（主色相 / 圆角 / 间距 / 密度 / hover 风格）：

| 预设 | 主色相 | 圆角 | 间距 | 密度 | hover |
| --- | --- | --- | --- | --- | --- |
| `default` | 203（品牌蓝） | ground 圆角 | 8px | normal | default |
| `business` | 217（深蓝商务） | square 直角 | 4px | compact | default |
| `fresh` | 150（清新绿） | ground 圆角 | 12px | comfortable | rounded |

```ts
import { useTheme } from '@easemob/uikit-im'

const { setPreset, preset } = useTheme()

setPreset('business') // 整套切换
// 预设是基底，应用后仍可单项微调（单项覆盖优先）
setPrimaryColor(262)
```

## Provider 声明式配置

使用 `EmUIKitProvider` 时，可以通过 `theme` prop 在模板中声明式配置，无需写 JS：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :theme="{
      preset: 'business', // 'default' | 'business' | 'fresh'，应用后单项可覆盖
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
