# 主题配置能力审查（字号 / 适老版 / 密度 / 定制灵活性）

> 审查日期：2026-08-05。文中行号为当日代码快照，可能随改动漂移，以文件+特征定位为准。
> 状态：**Phase 1（D3/D4/D12 token 漂移债）已实施，字号/语义 token/Provider 扩展待后续**。关联 TECH-DEBT：D3 / D4（已完成） / D12（部分完成）。

## 结论先行

**底层主题机制（CSS 变量契约 + `data-uikit-*` 属性驱动 + store 运行时联动）是健康的，缺的不是架构而是覆盖面**：字号、密度、气泡色三个维度基本从零开始，且都被 D3/D4/D12 的硬编码债务卡着。建议先还债再铺新能力。

## 当前已有的能力

| 维度 | 能力 | 入口 |
|---|---|---|
| 模式 | light / dark / auto（auto 经 `usePreferredColorScheme` 跟随系统），localStorage 持久化 | `store/theme.ts:88-96`、`useTheme()` |
| 主色 | hue 数字（0-360），运行时重算 `--uikit-primary-color` 系列 | `setPrimaryColor` |
| 形状 | 头像 / 气泡 / 组件圆角切换、`hoverStyle`、`containerGap` | themeStore 各 setter |
| 动效 | 开关 + subtle/normal/expressive 分级 + ripple；`prefers-reduced-motion` 兜底 | `:animation` prop / store |
| H5 | 安全区 / 键盘 / 下拉刷新 | `:h5` prop |
| 底层 | `theme/index.css`（约 385 行）变量契约 + `[data-uikit-theme]`/`[data-uikit-anim-*]` 属性覆盖 | — |

## 缺失项（按价值排序）

### 1. 字号体系完全空白 —— 适老版的最大硬门槛

- 全库 **357 处 `font-size: <数字>px` 硬编码，分布在 119 个文件**；`font-size: var(...)` 命中 **0**。没有任何字号 token（`--uikit-font-` 只有 `font-family`）。
- `--uikit-font-scale` 是**纯预留**：`theme/index.css:112` 定义、`use-h5-adaptation.ts:113-120` 把 `h5.fontScale` 写进变量，但**没有任何组件消费它**（`use-h5-adaptation.ts:12` 注释自认"暂不生效，P2 预留"）。
- 含义：做字号调节/适老版，需先建字号 token 体系（如 `--uikit-font-size-xs/sm/base/lg/xl` + 消息正文独立 token），再改造 357 处硬编码——工程量最大、也最基础。

### 2. 无全局密度（density）概念

- 只有局部 size prop：`Cell` 的 compact/normal/large（`components/cell/cell.vue:15`，且 `--uikit-cell-height-*` 未进 `theme/index.css`）、ContactItem/GroupItem 的 size。
- padding 走 token 的全库仅 13 处，其余硬编码。做全局 compact/comfortable 档意味着间距也要 token 化。

### 3. 高频业务定制点没有独立 token

- **气泡颜色**：搜 `--uikit-bubble` 零命中。对方气泡直接用 `--uikit-bg-secondary`、自己气泡用 `--uikit-primary-color`（`text-message.vue:302-315`）——改气泡色只能连带改通用变量，一改全站变色。`bubbleShape` 只切圆角不切颜色。
- 消息列表背景、输入区背景同理，无专门配置点。
- 建议补：`--uikit-bubble-bg-self/other`、`--uikit-bubble-text-self/other`、`--uikit-chat-bg` 等语义 token。

### 4. Provider `theme` prop 入口偏窄

`uikit-provider.vue:24-31` 的 `theme` prop 只有 4 个字段（mode/primaryColor/gap/shape），且：

- **mode 不含 `'auto'`**（store 支持三档，prop 只放两档，不一致）；
- `onMounted` **一次性应用，非响应式**——业务后续改 prop 不生效，必须走 `useTheme()`；
- 不含字号/密度/气泡色（底层尚不存在）。

### 5. token 化不彻底的历史债（制约上面所有扩展）

- **D3**：约 140 处 hex + 51 处 rgba 硬编码颜色——业务 `:root` 覆盖变量时这些组件不跟随，"换肤换不动"；
- **D4**：组件引用了未定义的 `--uikit-*`（如 `--uikit-primary-rgb` 固定蓝值，改主题色后 pinned 态颜色错误）；
- **D12**：约 50 处硬编码 transition 时长绕过动画开关；圆角还有 213 处硬编码。

## 建议推进顺序

1. ✅ **先清 D3 / D4 / D12（2026-08-05 已完成 worst offenders）**——`theme/index.css` 补 `--uikit-shadow-sm`、`store/theme.ts` 同步 `--uikit-primary-hover`；worst offenders 的裸 hex、不一致 fallback、硬编码 transition 已替换。
2. ✅ **建字号 token 体系并激活 `--uikit-font-scale`（2026-08-06 完成核心链路）**——`theme/index.css` 新增 `--uikit-font-size-10~22` token；`store/theme.ts` / `use-theme.ts` 新增 `fontSizeScale`/`setFontSize`（normal/large/xlarge）；`uikit-provider.vue` 支持 `theme.fontSize` 与 `theme.mode: 'auto'` 并响应式应用；demo 外观面板加档位切换；高频组件（45 文件 144 处）字号已 token 化。**剩余约 213 处低频文件字号待 Phase 2.5。**
3. **补高频语义 token**：气泡色、聊天背景。
4. **扩 Provider `theme` prop**：density 等。
5. **密度档最后做**（依赖间距 token 化，工程量最大、优先级相对低）。
