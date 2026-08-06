# 主题配置能力审查（字号 / 适老版 / 密度 / 定制灵活性）

> 审查日期：2026-08-05；2026-08-06 更新密度能力。文中行号为当日代码快照，可能随改动漂移，以文件+特征定位为准。
> 状态：**Phase 1（D3/D4/D12 token 漂移债 worst offenders）已实施；Phase 2 字号体系、Phase 2.5 低频字号、Phase 3 高频语义 token 已完成；Phase 4 Provider 密度能力已完成**。关联 TECH-DEBT：D3（剩余非高频散落 hex） / D4（已完成） / D12（剩余非高频 transition） / D86（字号/密度/语义 token 已完成）。

## 结论先行

**底层主题机制（CSS 变量契约 + `data-uikit-*` 属性驱动 + store 运行时联动）是健康的，缺的不是架构而是覆盖面**：字号、密度、气泡色三个维度基本从零开始，且都被 D3/D4/D12 的硬编码债务卡着。建议先还债再铺新能力。

## 当前已有的能力

| 维度 | 能力 | 入口 |
|---|---|---|
| 模式 | light / dark / auto（auto 经 `usePreferredColorScheme` 跟随系统），localStorage 持久化 | `store/theme.ts:88-96`、`useTheme()` |
| 主色 | hue 数字（0-360），运行时重算 `--uikit-primary-color` 系列 | `setPrimaryColor` |
| 形状 | 头像 / 气泡 / 组件圆角切换、`hoverStyle`、`containerGap` | themeStore 各 setter |
| 密度 | compact / normal / comfortable 三档；驱动 Cell 高度、列表项内边距、Header 内边距、列表间距 | `store/theme.ts` `setDensity` / `uikit-provider.vue` `theme.density` |
| 动效 | 开关 + subtle/normal/expressive 分级 + ripple；`prefers-reduced-motion` 兜底 | `:animation` prop / store |
| H5 | 安全区 / 键盘 / 下拉刷新 | `:h5` prop |
| 底层 | `theme/index.css`（约 385 行）变量契约 + `[data-uikit-theme]`/`[data-uikit-anim-*]` 属性覆盖 | — |

## 缺失项（按价值排序）

### 1. 字号体系完全空白 —— 适老版的最大硬门槛

- 全库 **357 处 `font-size: <数字>px` 硬编码，分布在 119 个文件**；`font-size: var(...)` 命中 **0**。没有任何字号 token（`--uikit-font-` 只有 `font-family`）。
- `--uikit-font-scale` 是**纯预留**：`theme/index.css:112` 定义、`use-h5-adaptation.ts:113-120` 把 `h5.fontScale` 写进变量，但**没有任何组件消费它**（`use-h5-adaptation.ts:12` 注释自认"暂不生效，P2 预留"）。
- 含义：做字号调节/适老版，需先建字号 token 体系（如 `--uikit-font-size-xs/sm/base/lg/xl` + 消息正文独立 token），再改造 357 处硬编码——工程量最大、也最基础。

### 2. 全局密度（density）已接入基础链路 ✅

- `theme/index.css` 新增 `--uikit-cell-height` / `--uikit-cell-height-compact` / `--uikit-cell-height-large` / `--uikit-cell-padding-y` / `--uikit-list-gap` / `--uikit-header-padding-y`，并通过 `[data-uikit-density="compact"|"normal"|"comfortable"]` 覆盖。
- `store/theme.ts` / `use-theme.ts` 新增 `density` 与 `setDensity`；`uikit-provider.vue` `theme` prop 支持 `density` 并响应式应用。
- `Cell` 默认高度 / 紧凑高度 / 大尺寸高度、`auto-height` 垂直内边距已改用上述变量；`chat.vue` 头部内边距也已接入 `--uikit-header-padding-y`。
- 局部 `size` prop（`Cell` / `ContactItem` / `GroupItem`）仍优先于全局密度，保留业务显式覆盖能力。
- 剩余可扩展：更多组件（如输入区、消息气泡间距、抽屉内边距）可继续跟随密度变量，但高频列表项已覆盖。

### 3. 高频业务定制点已有独立 token ✅

- **气泡颜色**：`--uikit-bubble-bg-other/self`、`--uikit-bubble-text-other/self` 已定义，消息组件已接入。
- **聊天背景**：`--uikit-chat-bg` 已定义，聊天容器/聊天页使用 `background` 简写，支持颜色/渐变/图片。
- **输入区背景**：`--uikit-input-bg` 已定义，PC/H5 输入区已接入。
- 剩余未 token 化的高频定制点：消息内引用卡片（`quote-card`） nested 颜色、媒体消息遮罩层颜色。

### 4. Provider `theme` prop 仍有扩展空间

`uikit-provider.vue` 的 `theme` prop 已扩展至 mode/primaryColor/gap/shape/fontSize/bubbleColor/chatBg/inputBg，且已响应式应用。仍缺少：

- **density**（compact/normal/comfortable）；
- 引用卡片/媒体遮罩等 nested 语义色。

### 5. token 化不彻底的历史债（制约上面所有扩展）

- **D3**：约 140 处 hex + 51 处 rgba 硬编码颜色——业务 `:root` 覆盖变量时这些组件不跟随，"换肤换不动"；
- **D4**：组件引用了未定义的 `--uikit-*`（如 `--uikit-primary-rgb` 固定蓝值，改主题色后 pinned 态颜色错误）；
- **D12**：约 50 处硬编码 transition 时长绕过动画开关；圆角还有 213 处硬编码。

## 建议推进顺序

1. ✅ **先清 D3 / D4 / D12（2026-08-05 已完成 worst offenders）**——`theme/index.css` 补 `--uikit-shadow-sm`、`store/theme.ts` 同步 `--uikit-primary-hover`；worst offenders 的裸 hex、不一致 fallback、硬编码 transition 已替换。
2. ✅ **建字号 token 体系并激活 `--uikit-font-scale`（2026-08-06 完成）**——`theme/index.css` 新增 `--uikit-font-size-8~22` token；`store/theme.ts` / `use-theme.ts` 新增 `fontSizeScale`/`setFontSize`（normal/large/xlarge）；`uikit-provider.vue` 支持 `theme.fontSize` 与 `theme.mode: 'auto'` 并响应式应用；demo 外观面板加档位切换；高频组件（45 文件 144 处）与低频文件（57 文件 207 处）字号均已 token 化，仅剩 4 处 story 装饰性 emoji 尺寸保持 px。
3. ✅ **补高频语义 token（2026-08-06 完成）**——`theme/index.css` 新增 `--uikit-bubble-bg-other/self`、`--uikit-bubble-text-other/self`、`--uikit-chat-bg`、`--uikit-input-bg`；`store/theme.ts` / `use-theme.ts` 新增 `bubbleBgOther`/`bubbleBgSelf`/`chatBg`/`inputBg` 与 setter；`uikit-provider.vue` 支持 `theme.bubbleColor`（self/other）、`theme.chatBg`、`theme.inputBg`；消息组件（text/file/voice/video/image/location/combine/custom）与聊天容器、输入区、时间分隔线全部接入语义 token。`--uikit-chat-bg` 使用 `background` 简写，默认支持颜色/渐变/`url(...)` 图片背景。
4. ✅ **扩 Provider `theme` prop：density（2026-08-06 完成）**——新增 `Density = 'compact' | 'normal' | 'comfortable'`；`theme/index.css` 通过 `[data-uikit-density]` 覆盖 Cell/Header/列表间距变量；`Cell` 与 `chat.vue` 头部已接入；demo 外观面板提供三档切换。
5. **后续可选项**：把密度变量扩展到输入区、消息气泡间距、抽屉内边距、按钮高度等更多组件；继续清 D3/D12 剩余非高频硬编码。
