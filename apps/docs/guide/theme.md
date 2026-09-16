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

- `--uikit-primary-color`：主品牌色，默认 `hsl(203, 100%, 60%)` 环信蓝；运行时由 `primaryColor + primaryColorSaturation/Lightness` 重算（`hsl(h, s%, l%)`）
- `--uikit-primary-hover`：主色 hover 态（随主色饱和度/亮度联动）
- `--uikit-primary-rgb`：主色 RGB 三元组（用于 `rgba()` 半透明背景）
- `--uikit-primary-soft`：主色 15% 透明派生色（`color-mix` 实时派生，用于光晕/弱强调底，自动跟随主色与明暗模式）
- `--uikit-success-color`：成功色
- `--uikit-warning-color`：警告色
- `--uikit-danger-color`：危险色
- `--uikit-info-color`：信息色

> 品牌主色支持「完整 HSL」：`theme.primaryColor` 与 `useTheme().setPrimaryColor` 既可传色相数字（0-360，保留当前饱和度/亮度），也可传 `{ h, s, l }` 对象（取色器选完整主色场景）。

### 文字与背景层级

- `--uikit-text-primary`：主要文字（浅色 `#171A1C` / 暗色 `#E8EAED`）
- `--uikit-text-secondary`：次要文字（浅色 `#5E686E` / 暗色 `#9AA0A6`）
- `--uikit-text-tertiary`：三级文字（占位符、时间戳等，浅色 `#919BA1` / 暗色 `#737B82`）
- `--uikit-bg-base`：页面/面板基础背景（暗色 `#1E2123`）
- `--uikit-bg-secondary`：次级背景（搜索框、过滤项等内陷填充，暗色 `#2A2A30`）
- `--uikit-bg-tertiary`：三级背景（暗色 `#333537`）
- `--uikit-bg-elevated`：浮层背景（弹窗、抽屉，暗色 `#1E2123`）
- `--uikit-bg-hover`：hover 背景（暗色 `#2A2A30`）
- `--uikit-bg-active`：按下 / 选中背景（暗色为固定藏青 `#0D2840`，不跟随主色）
- `--uikit-control-bg`：控件填充底（按钮 default、暗色对方气泡、系统消息 pill 等；浅色 `#F3F4F6` 与 bg-secondary 同值，暗色 `#333537`）

### 边框与分割线

- `--uikit-border-color`：常规边框
- `--uikit-border-light`：浅边框
- `--uikit-divider-color`：分割线
- `--uikit-header-border-width`：header 底部分隔线宽度（默认 `0px` 关闭；由全局开关 `headerBorder` / `setHeaderBorder()` 覆写为 `1px`）

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
- `--uikit-sidebar-width`：侧栏列表容器（会话 / 联系人 / 群组 / 通讯录 / 黑名单）默认宽度（默认 360px；宿主可在容器作用域覆写，如 H5 全宽设为 `100%`）
- `--uikit-components-radius`：组件圆角（默认 8px）
- `--uikit-components-radius-hover`：hover 圆角（默认 14px）
- `--uikit-popup-padding`：弹出层内边距（默认 4px，hover/展开态 8px），用于 Popup / 菜单 / 表情面板等浮层内容与边界的留白
- `--uikit-item-hover-radius` / `--uikit-item-active-radius`：列表项 hover / 选中态圆角（随 `hoverStyle` 联动，`square` 档归零为 0px，core 2.4.0 新增）
- `--uikit-item-hover-margin-x` / `--uikit-item-hover-padding-x`：`hoverStyle: 'rounded'` 卡片式缩进的左右外边距与内容内边距（`default` / `square` 档为 `0px` / `16px`，core 2.4.0 新增）

### 阴影

- `--uikit-shadow`：常规阴影
- `--uikit-shadow-hover`：hover / 浮起阴影
- `--uikit-shadow-sm`：轻量小阴影（卡片/抽屉内）

### 字体与字号

- `--uikit-font-family`：字体族栈。栈首 `'Inter'`（拉丁字形）/ `'Noto Sans SC'`（中文），本机未安装时回落 PingFang SC / 雅黑 / 思源黑体等系统字体；库不内置网络字体加载，需要精确字形时由接入方自行引入 webfont，或直接覆盖该变量。

字号 token 与 `--uikit-font-scale` 联动，用于实现全局字号缩放（适老版）：

- `--uikit-font-scale`：全局字号缩放倍数（默认 `1`）
- `--uikit-font-size-8` ~ `--uikit-font-size-34`：按像素基准 × 缩放倍数计算（含 28 / 34 大标题档）

### 字重与行高

- `--uikit-font-weight-regular`：400（正文）
- `--uikit-font-weight-medium`：500（强调）
- `--uikit-font-weight-semibold`：600（小标题）
- `--uikit-font-weight-bold`：700（大标题）
- `--uikit-font-lineheight-tight`：1.25（标题/紧凑）
- `--uikit-font-lineheight-normal`：1.5（正文）
- `--uikit-font-lineheight-relaxed`：1.75（宽松说明）

### 排版层级

层级由原子组件 `EmText` 承载（`level` prop），每档内置「字号 + 行高」配对与默认字重，底层走 `--uikit-font-size-*` token、行高按 `calc(Npx × --uikit-font-scale)` 等比缩放；命名对齐设计侧 Value.tokens.json：

| 层级（`level`） | 字号 | 行高 | 默认字重 | 常用颜色 | 用途 |
| --- | --- | --- | --- | --- | --- |
| h0 | 34 | 42 | 600 | `text-primary` | 页面大标题 |
| h1 | 28 | 34 | 600 | `text-primary` | 模块大标题 |
| h2 | 22 | 26 | 600 | `text-primary` | 弹窗标题、模块标题 |
| h3 | 18 | 24 | 600 | `text-primary` | 卡片标题、抽屉标题 |
| body-lg | 16 | 24 | 400 | `text-primary` | 正文大字号（H5 输入框规避 iOS 缩放） |
| body | 14 | 22 | 400 | `text-primary` | 默认正文 |
| body-sm | 13 | 20 | 400 | `text-secondary` | 辅助说明、时间戳 |
| caption | 12 | 18 | 400 | `text-tertiary` | 标签、提示、错误文案 |
| small | 10 | 14 | 500 | `text-tertiary` | 徽标数字、极小标签 |
| mini | 8 | 12 | 500 | `text-tertiary` | 极小徽标数字 |

> 旧命名对照：Display→h2、H2→h3、H3/Body-L→body-lg、Body-M→body、Body-S→body-sm、Caption→caption、Overline→small；旧 H1（20px）/ H4（15px）无对应新档，其 token 保留供组件内部使用。`EmText` 另提供 `weight`（覆盖默认字重）/ `ellipsis`（单行截断）/ `tag`（默认 `span`）props。

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

- `--uikit-bubble-bg-other`：对方气泡背景（默认 `#E4E6E7`，暗色 `--uikit-control-bg` `#333537`）
- `--uikit-bubble-bg-self`：自己气泡背景（默认 `#009EFF` 品牌蓝，暗色 `#33B1FF`；不跟随主色，可用 `setBubbleBg` / 主题预设覆盖）
- `--uikit-bubble-text-other`：对方气泡文字（默认 `#171A1C`，暗色 `--uikit-text-primary`）
- `--uikit-bubble-text-self`：自己气泡文字（默认 `#FFFFFF`，暗色按设计稿反转为 `#1E2123`）
- `--uikit-bubble-divider-other` / `--uikit-bubble-divider-self`：气泡内分割线（译文 / 语音转文字与原文之间；暗色统一 `#3C3F42`）
- `--uikit-bubble-radius` / `--uikit-bubble-radius-square`：气泡圆角档位（`bubbleShape: 'round'` = 16px（默认）/ `'square'` = 8px）
- `--uikit-chat-bg`：聊天背景（默认 `--uikit-bg-base`，暗色 `#1E1E23` 比面板深一档；使用 `background` 简写，支持颜色/渐变/图片）
- `--uikit-input-bg`：输入区背景（默认 `--uikit-bg-base`，暗色 `#1E2123`）
- `--uikit-conversation-list-bg`：会话列表容器背景（默认 `#FAFAFA`，暗色 `#1E2123`）
- `--uikit-input-border-color`：输入框默认边框色（默认 `#C9CDCF`，暗色 `#3C3F42`；search/filled 变体无边框不受其影响）
- `--uikit-quote-line-color`：引用/回复竖线色（默认 `#C9CDCF`，暗色 `#3C3F42`；气泡下引用卡与输入框引用条共用）
- `--uikit-msg-status-badge-color`：消息状态徽章（群已读/未读数胶囊）边框与文字色（默认 `#47ADEB`，明暗一致，独立于主色）
- `--uikit-bubble-text-self-secondary`：己方气泡内次级文字（文件大小等弱化信息，默认 `#EFEFEF`，暗色 `rgba(30, 33, 35, 0.72)`）
- `--uikit-file-card-radius`：文件消息卡片圆角（默认 `12px`，独立于气泡圆角两档 `bubbleShape`）
- `--uikit-empty-icon-color` / `--uikit-empty-text-color`：空状态占位图标 / 文案颜色（默认 `#E6E6E6` / `#BDBDBD`，暗色 `#464E53` / `#737B82`）
- `--uikit-badge-bg`：徽标（未读数 / 红点）默认背景色（默认 `#FF7070`，明暗一致，独立于 danger 语义色，`Badge` 的 `color` prop 可覆盖）；`--uikit-badge-text` 为徽标文字色（默认 `#FFFFFF`，暗色按设计稿反转为 `#1E1E23`）
- `--uikit-switch-off-bg`：Switch 关闭态轨道色（默认 `#E3E6E8`，暗色 `#3A3D40`）；`--uikit-switch-on-bg` 为开启态轨道色（品牌蓝 `#009EFF`，暗色 `#33B1FF`，不跟随主题色）；`--uikit-switch-on-disabled-bg` 为开启禁用态轨道色（品牌蓝 20% 叠页面底 `color-mix` 派生，浅色下即 `#CCECFF`）
- `--uikit-switch-halo-off` / `--uikit-switch-halo-on`：Switch hover/pressed 手柄外圈状态层光圈色（off 默认 5% 黑、暗色 8% 白；on 为品牌蓝 10% `color-mix` 派生）；`--uikit-switch-track-inner-shadow` 为 hover/pressed 轨道内阴影；`--uikit-switch-handle-bg` / `--uikit-switch-handle-ring` / `--uikit-switch-handle-shadow` 为手柄底色（浅色恒白，暗色按设计稿 `#1E2123`）、1px 描边（`#F1F2F3`，暗色 `#333538`）与双层落影
- `--uikit-switch-track-w` / `--uikit-switch-track-h`：Switch medium 轨道宽高（默认 `36px` / `20px`）；`--uikit-switch-small-track-w` / `--uikit-switch-small-track-h` 为 small 档（默认 `28px` / `16px`），手柄尺寸由轨道高自动派生，覆盖即可全局自定义开关宽高
- `--uikit-drawer-close-color`：会话详情抽屉头部图标色（关闭 / 返回 / 上传，默认 `#000000`，暗色 `--uikit-text-primary`）
- `--uikit-drawer-action-btn-color`：会话详情抽屉底部胶囊按钮文字色（默认 `#000000`，暗色 `--uikit-text-primary`）
- `--uikit-drawer-field-action-color`：抽屉字段编辑按钮弱化图标色（默认 `#C9CDCF`，暗色 `--uikit-icon-muted`）
- `--uikit-member-name-color`：群成员名颜色（默认 `#000000`，暗色 `--uikit-text-primary`）
- `--uikit-member-tag-muted-color` / `--uikit-member-tag-blocked-color`：群成员状态标签色（禁言默认 `#A9AEB2` 明暗通用；拉黑默认 `#484D51`，暗色 `--uikit-text-secondary`），同系 12% 底色由 `color-mix` 派生

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

暗色模式文字与背景组合已按 WCAG 2.1 标准验证（正文 AA ≥4.5:1，大文字/辅助文本 ≥3:1）：

| 文字色 \ 背景 | `bg-base` (#1E2123) | `bg-secondary` (#2A2A30) | `chat-bg` (#1E1E23) | 结果 |
| --- | --- | --- | --- | --- |
| `text-primary` (#E8EAED) | 13.44:1 | 11.84:1 | 13.78:1 | PASS AA |
| `text-secondary` (#9AA0A6) | 6.13:1 | 5.40:1 | 6.29:1 | PASS AA |
| `text-tertiary` (#737B82) | 3.77:1 | 3.32:1 | 3.86:1 | 大文字/辅助文本 PASS（正文 AA 不达标） |

> 三级文字 `#737B82` 为设计稿暗色时间戳/占位符色值，仅用于辅助性短文本（时间、占位提示等 WCAG 豁免的 incidental 场景），达到大文字 ≥3:1 标准；正文场景请使用 `text-secondary` 及以上层级。

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
  primaryColorSat,
  primaryColorLum,
  avatarShape,
  bubbleShape,
  componentsShape,
  containerGap,
  hoverStyle,
  animationEnabled,
  animationLevel,
  fontSizeScale,
  density,
  headerBorder,
  preset,
  setPrimaryColor,
  setPrimaryColorSat,
  setPrimaryColorLum,
  setAvatarShape,
  setBubbleShape,
  setComponentsShape,
  setContainerGap,
  setHoverStyle,
  setAnimationEnabled,
  setAnimationLevel,
  setFontSize,
  setFontSizeScale,
  setDensity,
  setHeaderBorder,
  setBubbleBg,
  setChatBg,
  setInputBg,
  hoverColor,
  activeColor,
  iconMutedColor,
  setHoverColor,
  setActiveColor,
  setIconMutedColor,
  setPreset,
  toggleMode,
} = useTheme()

// 按品牌色相环调整主色（0-360，保留当前饱和度/亮度）
setPrimaryColor(262)

// 也可以传入完整 HSL 对象（取色器「选完整主色」场景，同时更新 H/S/L）
setPrimaryColor({ h: 262, s: 72, l: 52 })
setPrimaryColorSat(72)   // 单独调饱和度（0-100）
setPrimaryColorLum(52)   // 单独调亮度（0-100）

// 头像 / 气泡 / 组件圆角形态：'circle' | 'square' / 'ground' | 'square'
setAvatarShape('square')
setBubbleShape('square')
setComponentsShape('square')

// 容器间距与 hover 风格
setContainerGap(12)
// 列表项 hover 风格：'default' 整行高亮（8px 圆角，无缩进）/
// 'rounded' 卡片式（8px 圆角 + 左右 8px 缩进）/'square' 直角整行高亮
setHoverStyle('rounded') // 'default' | 'rounded' | 'square'

// 字号：标准 / 大 / 特大（适老版）
setFontSize('xlarge')
// 或直接指定缩放倍数
setFontSizeScale(1.25)

// 密度：紧凑 / 标准 / 宽松（信息密度控制）
setDensity('compact') // 'compact' | 'normal' | 'comfortable'

// Header 底部分隔线：会话 / 通讯录 / 聊天 / 抽屉 / 弹窗 header 的 1px 底线，默认关闭
setHeaderBorder(true)

// 预设主题：一键切换整套风格（'default' | 'business' | 'fresh'）
setPreset('business')

// 气泡色、聊天背景、输入区背景
setBubbleBg('#f3f4f6', '#7c3aed')
setBubbleBg(null) // 传 null 重置为默认主题色
setChatBg('url(/chat-bg.png)')
setInputBg('#ffffff')

// 自定义 hover / 选中（active）/ 弱化图标色：
// 单值同时作用于浅色与深色模式；不设置（undefined）时走内置浅/深默认
setHoverColor('#e5e7eb')                       // 列表项 / 菜单项悬停背景
setActiveColor('rgba(51, 177, 255, 0.08)')     // 会话列表当前选中项背景（默认跟随主色）
setIconMutedColor('#b6b8bf')                   // 占位 / 弱化图标
setHoverColor(undefined)                       // 传 undefined 恢复内置默认

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
| `business` | 217（深蓝商务） | square 直角 | 4px | compact | square |
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
      primaryColor: 262, // 色相(0-360)，或传完整 HSL 对象 { h, s, l }
      gap: 12,
      shape: 'square',
      fontSize: 'xlarge', // 'normal' | 'large' | 'xlarge' 或具体倍数
      density: 'compact', // 'compact' | 'normal' | 'comfortable'
      headerBorder: true, // header 底部分隔线总开关（默认 false 关闭）
      bubbleColor: { other: '#f3f4f6', self: '#7c3aed' },
      chatBg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      inputBg: '#ffffff',
      hoverColor: '#e5e7eb',                    // 悬停背景色（深浅模式同值，缺省走内置默认）
      activeColor: 'rgba(51, 177, 255, 0.08)', // 选中项背景色（缺省跟随品牌主色）
      iconMutedColor: '#b6b8bf',               // 弱化/占位图标色（缺省走内置默认）
    }"
  >
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

`bubbleColor` 也支持传字符串同时设置自己/对方：`bubbleColor: '#7c3aed'`。`chatBg` 支持颜色、渐变或 `url(...)` 图片背景。`hoverColor` / `activeColor` / `iconMutedColor` 均为单值（任意 CSS 颜色），自定义后浅色与深色模式共用该值；不配置时分别走内置浅/深默认（`--uikit-bg-hover` / `--uikit-bg-active` 跟随主色 / `--uikit-icon-muted`），也可以通过覆盖同名 CSS 变量微调。

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
