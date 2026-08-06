# 数字胶囊（Digital Capsule）消息状态与未读数设计应用预研

> 日期：2026-08-06 · 状态：预研完成，待决策实施
> 对应 TECH-DEBT：D91 · 关联：D90（iconStyle 面性/线性切换）、D86（主题体系）、`ICON-STYLE-SYSTEM-RESEARCH.md`

## 背景

设计师交付了一套「数字胶囊」设计规范，目标是统一 UIKit 中两类高频状态视觉：

1. **消息状态（单聊已读回执）**：明确区分「对方未读」与「对方已读」。
2. **未读数徽章（Badge）**：会话列表、群组等场景的未读计数，按数字位数自适应胶囊尺寸。

源文件位于 `消息状态以及未读状态/`，含线性（stroked）与面性（filled）两种风格，以及 normal/small 两种尺寸。

## 设计稿解读

### 1. 数字胶囊未读数

| 位数 | normal 尺寸 | small 尺寸 | 说明 |
|---|---|---|---|
| 一位数（units） | 24 × 24 | 18 × 18（推测） | 强制正圆，数字居中 |
| 两位数（tens） | 32 × 24 | 26 × 18（推测） | 圆角胶囊，宽度随内容增长 |
| 三位数（hundreds） | 42 × 24 | 34 × 18（推测） | 圆角胶囊，可显示 888/99+ 等 |
| 无数字（none） | 24 × 24 | 12 × 12（推测） | 纯圆点，用于红点模式 |

风格切换：

- **filled（面性）**：实心背景 + 反白文字，视觉重量高，在小尺寸下更醒目。
- **stroked（线性）**：空心描边 + 同色系文字，视觉更轻盈，与当前线性图标集气质一致。

> 注意：源目录中的 `.svg` 是固定数字 `8` 的**视觉样例**，文字是 path 写死的，不能直接作为运行时图标使用。落地时应以 CSS 绘制胶囊 + 动态文本渲染。

### 2. 消息状态图标

设计稿右侧给出四种基础图形：

| 图形 | 语义（按设计师描述） | 当前 UIKit 对应状态 |
|---|---|---|
| 空心圆 | 对方未读 | `READ` 之前的所有非失败状态 |
| 空心圆 + 对勾 | 对方已读 | `READ` |
| 实心圆点 | 面性版：未读 | — |
| 实心圆点 + 对勾 | 面性版：已读 | — |

当前 UIKit 使用通用图标表达消息状态：`SENT=单勾`、`DELIVERED/READ=双勾(doneAll)`、`FAILED=回转箭头`。新设计把单聊回执语义收敛为「未读 / 已读」两态，更符合国内 IM（微信/企业微信）用户心智。

> 当前源目录只交付了「空心圆」和「实心圆点」两种基础图形，**圆+对勾的组合图形尚未导出**。落地时可选：① 让设计师补 `circle_check` / `dot_check`；② 用 `Icon` 组合渲染（圆底 + check 小标）。

## 当前实现盘点

### Badge 组件

- 文件：`packages/uikit/src/components/badge/badge.vue`
- 现状：CSS 实现，高度固定 `1.6em`，宽度按内容自适应；一位数时强制正圆（`border-radius: 50%`），多位数时圆角胶囊。
- 问题：
  - 没有按位数（units/tens/hundreds）显式调整宽度，当前尺寸依赖 `min-width: 1.6em` 和 `padding: 0 0.25em`，三位数时可能过挤。
  - 没有 `filled/stroked` 风格切换，始终是实心背景（默认 `--uikit-danger-color`）。
  - 没有 `size=small` 变体。

### 消息状态

- 文件：`packages/uikit/src/modules/chat/message-item/message-bubble-wrapper.vue`
- 现状：通过 `messageStatusConfig.iconMap` 可自定义图标，默认映射为：
  - `SENDING` → `actions/loading_arc`
  - `SENT` → `actions/check`
  - `DELIVERED` → `chat/doneAll`
  - `READ` → `chat/doneAll`（通过颜色变为主色区分）
  - `FAILED` → `arrows/arrow_Uturn_clockwise`
- 问题：缺少专门的「空心圆 / 空心圆+对勾 / 实心圆点 / 实心圆+对勾」图标资源。

### 主题联动

- `ICON-STYLE-SYSTEM-RESEARCH.md` 已规划 `themeStore.iconStyle: 'stroked' | 'filled'`，但尚未实施（D90）。
- 字号缩放（`--uikit-font-scale`）已落地，Badge 使用 `em` 单位，理论上可跟随字号缩放，但需验证胶囊宽高比在放大后是否仍协调。

## 应用方案

### 方案 A：Badge 按数字胶囊规范重构（推荐优先做）

1. **扩展 `BadgeProps`**：
   - `size?: 'normal' | 'small'`（默认 `normal`）
   - `variant?: 'filled' | 'stroked'`（默认 `filled`，未来可绑定 `themeStore.iconStyle`）
   - 保留 `count` / `max` / `dot` / `color`。

2. **CSS 尺寸规范**：
   - normal：一位数 24×24，两位数 32×24，三位数 42×24；高度统一 24px。
   - small：按 normal 等比缩放（建议 0.75x）。
   - 使用 `font-size: var(--uikit-font-size-10)`，并通过 `min-width`/`padding` 控制位数宽度，不要写死 path。

3. **风格样式**：
   - `filled`：背景 `color`，文字 `#fff`。
   - `stroked`：背景透明，边框 `color`，文字 `color`。
   - 圆角保持 `height / 2` 即可得到标准胶囊。

4. **调用点**：
   - `conversation-item.vue` 的未读数直接受益。
   - 未来群组列表、通讯录等需要未读/计数标记处统一复用 `Badge`。

### 方案 B：消息状态图标补齐 + 新映射

1. **新增 SVG 图标资源**：
   - `status/circle`（空心圆）
   - `status/circle_check`（空心圆 + 对勾）
   - `status/dot`（实心圆点）
   - `status/dot_check`（实心圆点 + 对勾）
   - 如设计师不补 `circle_check` / `dot_check`，可在组件层用 `circle` + `actions/check` 组合。

2. **新增消息状态映射策略**：
   - 保持现有 `defaultStatusIconMap` 作为默认行为，避免破坏已有用户。
   - 提供可选的「数字胶囊风格映射」：
     - `SENT/DELIVERED` → `status/circle`（stroked） / `status/dot`（filled）
     - `READ` → `status/circle_check`（stroked） / `status/dot_check`（filled）
   - 通过 `messageStatusConfig.style: 'classic' | 'capsule'` 或全局 `themeStore.iconStyle` 切换。

3. **失败/发送中状态**：
   - `SENDING` 保持 `actions/loading_arc`。
   - `FAILED` 保持 `arrows/arrow_Uturn_clockwise` 或改用更直观的 `actions/xmark`。

### 方案 C：与 iconStyle 主题一键联动（依赖 D90）

当 `themeStore.iconStyle` 落地后：

- Badge 的 `variant` 默认取 `themeStore.iconStyle === 'filled' ? 'filled' : 'stroked'`。
- 消息状态图标在 `capsule` 模式下按 `iconStyle` 自动选 `circle/dot` 表。
- 无需业务组件逐个改动，整体视觉随主题切换。

## 推荐落地顺序

1. **先落地方案 A**：Badge 数字胶囊规范化，收益明确、改动可控，直接解决用户反馈的「群未读数字号过大/比例不协调」问题。
2. **再补齐方案 B**：新增 `status/*` 图标与可选映射，为单聊已读回执提供新视觉。
3. **最后方案 C**：等 D90（iconStyle 主题切换）实施后，把 Badge 与消息状态接入 `iconStyle`。

## 风险与注意

- **源 SVG 不能直接引用**：目录中的数字是写死 path，不能作为组件图标；落地必须是 CSS 胶囊 + 文本。
- **缺失 `circle_check` / `dot_check`**：需要确认设计师是否补充，否则组合渲染要保证小尺寸下对勾清晰。
- **字号缩放验证**：Badge 高度从 `1.6em` 改为固定 `24px` 后，适老版下需要确认是否仍然协调；建议高度仍用 `px` 固定、字号用 `em`，或提供 `small` 变体而非纯缩放。
- **暗色模式**：`stroked` 风格在暗色下描边颜色需使用语义 token（如 `--uikit-primary-color` / `--uikit-danger-color`），避免硬编码。
- **群已读回执圆圈**：当前 `message-bubble-wrapper.vue` 中群聊已读回执使用 14px 圆圈 + 人数/对勾，与新的数字胶囊规范不是同一组件，但视觉气质应对齐。

## 关联文档

- `ICON-STYLE-SYSTEM-RESEARCH.md`：面性/线性图标集切换规划，本设计的 `filled/stroked` 风格应与其统一。
- `THEME-CAPABILITY-REVIEW.md`：字号/密度/语义 token 现状，Badge 重构应使用已落地的字号 token。
- `TECH-DEBT.md`：D90（iconStyle）、D86（主题能力）。
