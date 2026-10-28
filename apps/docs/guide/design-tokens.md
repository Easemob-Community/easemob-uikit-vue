# 设计变量

UIKit 所有视觉参数沉淀为 `--uikit-*` CSS 变量，按颜色、字号、间距、圆角、阴影、动效六大类管理。本页集中展示全部 token 默认值与用途，便于设计与开发对齐。

## 颜色

### 品牌色与语义色

<div class="token-grid">
  <div class="token-color" style="--token-bg: hsl(203, 100%, 60%);"><span class="token-color__name">primary-color</span><span class="token-color__value">hsl(203, 100%, 60%)</span></div>
  <div class="token-color" style="--token-bg: hsl(142, 76%, 36%);"><span class="token-color__name">success-color</span><span class="token-color__value">hsl(142, 76%, 36%)</span></div>
  <div class="token-color" style="--token-bg: hsl(38, 100%, 60%);"><span class="token-color__name">warning-color</span><span class="token-color__value">hsl(38, 100%, 60%)</span></div>
  <div class="token-color" style="--token-bg: hsl(350, 100%, 60%);"><span class="token-color__name">danger-color</span><span class="token-color__value">hsl(350, 100%, 60%)</span></div>
  <div class="token-color" style="--token-bg: hsl(203, 100%, 60%);"><span class="token-color__name">info-color</span><span class="token-color__value">hsl(203, 100%, 60%)</span></div>
  <div class="token-color" style="--token-bg: #FF7070;"><span class="token-color__name">badge-bg</span><span class="token-color__value">#FF7070</span></div>
</div>

> `--uikit-badge-bg`（core 2.3.0）：徽标（未读数 / 红点）默认背景色，独立于 danger 语义色，明暗模式同值；`Badge` 的 `color` prop 可单项覆盖。

### 文字色（浅色模式）

<div class="token-grid">
  <div class="token-color token-color--light" style="--token-bg: #171A1C; color: #fff;"><span class="token-color__name">text-primary</span><span class="token-color__value">#171A1C</span></div>
  <div class="token-color token-color--light" style="--token-bg: #5E686E; color: #fff;"><span class="token-color__name">text-secondary</span><span class="token-color__value">#5E686E</span></div>
  <div class="token-color token-color--light" style="--token-bg: #919BA1; color: #fff;"><span class="token-color__name">text-tertiary</span><span class="token-color__value">#919BA1</span></div>
  <div class="token-color" style="--token-bg: #ffffff; border: 1px solid var(--vp-c-divider);"><span class="token-color__name" style="color: var(--vp-c-text-1);">text-inverse</span><span class="token-color__value" style="color: var(--vp-c-text-2);">#ffffff</span></div>
</div>

### 背景色（浅色模式）

<div class="token-grid">
  <div class="token-color" style="--token-bg: #ffffff; border: 1px solid var(--vp-c-divider);"><span class="token-color__name" style="color: var(--vp-c-text-1);">bg-base</span><span class="token-color__value" style="color: var(--vp-c-text-2);">#ffffff</span></div>
  <div class="token-color" style="--token-bg: #f3f4f6;"><span class="token-color__name">bg-secondary</span><span class="token-color__value">#f3f4f6</span></div>
  <div class="token-color" style="--token-bg: #f0f0f0;"><span class="token-color__name">bg-tertiary</span><span class="token-color__value">#f0f0f0</span></div>
  <div class="token-color" style="--token-bg: #ffffff; border: 1px solid var(--vp-c-divider);"><span class="token-color__name" style="color: var(--vp-c-text-1);">bg-elevated</span><span class="token-color__value" style="color: var(--vp-c-text-2);">#ffffff</span></div>
  <div class="token-color" style="--token-bg: #F5F5F5;"><span class="token-color__name">bg-hover</span><span class="token-color__value">#F5F5F5</span></div>
  <div class="token-color" style="--token-bg: #FAFAFA; border: 1px solid var(--vp-c-divider);"><span class="token-color__name" style="color: var(--vp-c-text-1);">conversation-list-bg</span><span class="token-color__value" style="color: var(--vp-c-text-2);">#FAFAFA</span></div>
</div>

> 暗色模式对应值见 [主题定制](./theme) 页暗色段，所有颜色 token 均已在 `[data-uikit-theme="dark"]` 下重写。

### 图片预览控制按钮

| Token | 默认值 | 用途 |
| --- | --- | --- |
| `--uikit-image-viewer-control-bg` | `rgba(0, 0, 0, 0.5)` | 关闭等浮层控制按钮背景，明暗模式同值 |
| `--uikit-image-viewer-control-bg-hover` | `rgba(0, 0, 0, 0.7)` | 浮层控制按钮 hover 背景，明暗模式同值 |

### 文件消息图标底色（core 2.6.0）

文件消息气泡左侧固定展示彩色底色块（双方气泡一致），图标本体固定白色，底色按扩展名 / 类别取对应品牌识别色，明暗模式通用：

<div class="token-grid">
  <div class="token-color" style="--token-bg: #DA3034;"><span class="token-color__name">file-icon-pdf</span><span class="token-color__value">#DA3034</span></div>
  <div class="token-color" style="--token-bg: #1D7044;"><span class="token-color__name">file-icon-xls</span><span class="token-color__value">#1D7044</span></div>
  <div class="token-color" style="--token-bg: #2B5797;"><span class="token-color__name">file-icon-doc</span><span class="token-color__value">#2B5797</span></div>
  <div class="token-color" style="--token-bg: #D24625;"><span class="token-color__name">file-icon-ppt</span><span class="token-color__value">#D24625</span></div>
  <div class="token-color" style="--token-bg: #424242;"><span class="token-color__name">file-icon-md</span><span class="token-color__value">#424242</span></div>
  <div class="token-color" style="--token-bg: #00897B;"><span class="token-color__name">file-icon-img</span><span class="token-color__value">#00897B</span></div>
  <div class="token-color" style="--token-bg: #E91E63;"><span class="token-color__name">file-icon-video</span><span class="token-color__value">#E91E63</span></div>
  <div class="token-color" style="--token-bg: #7B1FA2;"><span class="token-color__name">file-icon-audio</span><span class="token-color__value">#7B1FA2</span></div>
  <div class="token-color" style="--token-bg: #4CAF50;"><span class="token-color__name">file-icon-file</span><span class="token-color__value">#4CAF50</span></div>
</div>

> 上表 token 全名带 `--uikit-` 前缀（如 `--uikit-file-icon-pdf`）；`file-icon-file` 为未识别类型的普通文件回落色。

## 字号

| Token | 默认值 | 用途 |
| --- | --- | --- |
| `--uikit-font-size-7` | 7px | 极小徽标数字（原 8px 档顺延） |
| `--uikit-font-size-9` | 9px | Overline、徽标数字 |
| `--uikit-font-size-11` | 11px | Caption、标签 |
| `--uikit-font-size-12` | 12px | Body-S、辅助说明 |
| `--uikit-font-size-13` | 13px | Body-M、默认正文 |
| `--uikit-font-size-14` | 14px | H4、单元格标题 |
| `--uikit-font-size-15` | 15px | Body-L、H3 |
| `--uikit-font-size-16` | 16px | H2、卡片标题 |
| `--uikit-font-size-18` | 18px | 弹窗标题 |
| `--uikit-font-size-20` | 20px | h2、页面标题 |
| `--uikit-font-size-22` | 22px | h1、模块大标题 |
| `--uikit-font-size-28` | 28px | h0、页面大标题 |

> 2026-09-18 起字号档位整体降一档：原 16px 档降为 15px，其余档位依次顺延（原 34px 最大档不再保留，新增 7px 最小档）。

字号 token 均乘以 `--uikit-font-scale`（默认 1），用于适老版全局放大。

## 字重与行高

| Token | 默认值 |
| --- | --- |
| `--uikit-font-weight-regular` | 400 |
| `--uikit-font-weight-medium` | 500 |
| `--uikit-font-weight-semibold` | 600 |
| `--uikit-font-weight-bold` | 700 |
| `--uikit-font-lineheight-tight` | 1.25 |
| `--uikit-font-lineheight-normal` | 1.5 |
| `--uikit-font-lineheight-relaxed` | 1.75 |

完整排版层级表见 [主题定制 - 排版层级](./theme#排版层级)。

## 间距

<div class="token-spacing">
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 4px;"></span><span class="token-spacing__name">spacing-1</span><span class="token-spacing__value">4px</span></div>
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 8px;"></span><span class="token-spacing__name">spacing-2</span><span class="token-spacing__value">8px</span></div>
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 12px;"></span><span class="token-spacing__name">spacing-3</span><span class="token-spacing__value">12px</span></div>
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 16px;"></span><span class="token-spacing__name">spacing-4</span><span class="token-spacing__value">16px</span></div>
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 24px;"></span><span class="token-spacing__name">spacing-5</span><span class="token-spacing__value">24px</span></div>
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 32px;"></span><span class="token-spacing__name">spacing-6</span><span class="token-spacing__value">32px</span></div>
  <div class="token-spacing__item"><span class="token-spacing__bar" style="width: 48px;"></span><span class="token-spacing__name">spacing-7</span><span class="token-spacing__value">48px</span></div>
</div>

## 圆角

| Token | 默认值 | 用途 |
| --- | --- | --- |
| `--uikit-components-radius` | 8px | 组件默认圆角 |
| `--uikit-components-radius-hover` | 14px | hover / 展开态圆角 |
| `--uikit-image-viewer-control-radius` | 50% | 图片预览浮层控制按钮圆形半径 |
| `--uikit-bubble-radius` | 16px | 消息气泡圆角（round 档，默认） |
| `--uikit-bubble-radius-square` | 8px | 消息气泡圆角（square 档） |
| `--uikit-input-radius` | 999px | 输入框圆角（默认纯椭圆/胶囊，消息输入区消费） |

## 阴影

| Token | 默认值 |
| --- | --- |
| `--uikit-shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` |
| `--uikit-shadow` | `0 6px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)` |
| `--uikit-shadow-hover` | `0 10px 24px rgba(0,0,0,0.12), 0 18px 48px rgba(0,0,0,0.14)` |
| `--uikit-input-focus-ring` | `0 0 0 2px color-mix(in srgb, var(--uikit-primary-color) 20%, transparent)`（消息输入卡片聚焦光环，跟随主色） |

## 动效

| Token | 默认值 | 用途 |
| --- | --- | --- |
| `--uikit-anim-enabled` | 1 | 全局动画开关（0 关闭） |
| `--uikit-anim-duration` | 300ms | 基础时长 |
| `--uikit-anim-duration-enter` | 350ms | 入场时长 |
| `--uikit-anim-duration-leave` | 250ms | 出场时长 |
| `--uikit-anim-easing` | `cubic-bezier(0.4,0,0.2,1)` | 标准缓动 |
| `--uikit-anim-easing-decel` | `cubic-bezier(0,0,0.2,1)` | 入场减速 |
| `--uikit-anim-easing-accel` | `cubic-bezier(0.4,0,1,1)` | 出场加速 |
| `--uikit-anim-easing-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | 弹性过冲 |
| `--uikit-anim-scale-press` | 0.97 | 按压缩放比 |
| `--uikit-anim-scale-enter` | 0.92 | 弹窗入场缩放起点 |

## 图标总览

<IconGallery />

<style>
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin: 16px 0;
}
.token-color {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--token-bg);
  color: #fff;
}
.token-color--light {
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.token-color__name {
  font-size: 13px;
  font-weight: 600;
}
.token-color__value {
  font-size: 11px;
  opacity: 0.9;
}
.token-spacing {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
}
.token-spacing__item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.token-spacing__bar {
  height: 20px;
  background: var(--vp-c-brand);
  border-radius: 2px;
}
.token-spacing__name {
  width: 120px;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}
.token-spacing__value {
  font-size: 13px;
  color: var(--vp-c-text-2);
}
</style>
