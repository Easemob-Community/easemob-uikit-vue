# 面性图标集接入方案预研（ICON-STYLE-SYSTEM）

> 日期：2026-08-06 · 状态：预研完成，待决策实施
> 对应 TECH-DEBT：D90 · 关联：D86（主题体系）、`apps/docs/guide/icons.md`

## 背景

设计师交付了两套图标：

- **线性（stroked）**：`线性/icon/stroked/`，120 个，已完成全量替换落地（commit `d987802`，含识图审查修正）。
- **面性（filled）**：`面性/icon/filled/`，88 个，本预研的对象。命名与线性集**完全 1:1 对应**（`bell`↔`bell`、`rect/hanzi`↔`rect/hanzi`……）。

## 盘点结论（2026-08-06 识图审查）

- 面性集缺失的 32 个图形全部是 `arrow/*`、`chevron/*`、`check/*`、`xmark/*`、`plus`、`minus`、`hamburger`、`vertical`、`loading/*`、`items_check`、`lines/arrow-right_3bars` —— **纯线条图形，本身没有面性隐喻**（SF Symbols / Material Symbols 同样不为这些图形出 filled 变体）。不是设计师没画完，是体系本如此，切换时这些保持线性即可，视觉无碍。
- 面性集质量良好，且部分图形**辨识度优于线性版**：典型如 `pin`（面性是标准图钉造型，线性版形似台灯）、小尺寸状态图标（12-14px 的多选圈、已读勾在 filled 下更醒目）。
- 面性源文件为 fill 型 path（根 `fill="none"`、path 带 `fill="black"`），可用 `tmp/prepare-next-icons.mjs` 的 fill 型归一化规则直接处理成 `currentColor` 跟随主题色。
- 识图审查底稿：`tmp/icon-review/sheet-filled-*.png`（面性全集网格图，gitignored）。

## 技术可行性：高，改动可控

现有图标架构（`components/icon/icon-map.ts` + `icon.vue`）天然支持双风格：

- `icon-map` 按每个图标解析根节点 fill/stroke 绘制属性，`EmIcon` 已有**填充式 / 描边式两个渲染分支**——面性图标接入**不需要动渲染逻辑**。
- 接入方式 = 加第二个注册表（`assets/icons-filled/**/*.svg`，同一套 `import.meta.glob` 逻辑），`getIconSvg(name, style?)` 按主题态选表，面性缺失的 32 个 name **自动回落线性版**。
- 体积：88 个 SVG（约 1-2KB/个）eager 进 bundle 约增加 50-150KB raw（gzip 后远小于此）。可接受；若介意可对面性表做异步 `import` 按需加载，但会增加首图标渲染异步态，**不建议初版做**。
- 注意：`面性/` 与 `线性/` 源目录当前在 `.gitignore` 中（设计源资产不入库），规范化产物需像 `assets/icons-next/` 一样提交进包内（建议路径 `packages/uikit-im/src/assets/icons-filled/`）。

## 方案权衡

### 方案 A：主题级一键切换（`themeStore.iconStyle: 'stroked' | 'filled'`）

- 优点：实现简单（选表 + 回落即成）；是主题体系的差异化能力（品牌定制场景：有的客户品牌视觉就是面性图标）；与 D86 主题体系（字号/密度/气泡色）同一条线。
- 缺点：全局面性视觉重量大，IM 界面全实心块会丢失层次感——**不适合作为面向终端用户的常规开关**，定位应是"品牌风格"级配置。

### 方案 B：组件选中态自动配对（面性 = 选中/强调，线性 = 默认）

- 业界共识用法（iOS 底 tab、微信均为此模式）。现成落点：
  - 导航 / tab 类：选中 `chat/bubble_fill`、未选中 `chat/bubble`（demo 底 tab 是现成示范场景）；
  - 多选圈 `checked_ellipse`、已读 `doneAll`、置顶小标等小尺寸状态图标，面性辨识度更好；
  - `pin` 面性版明显优于线性版；
  - **消息状态与未读数徽章**：新交付的「数字胶囊」规范（见 `DIGITAL-CAPSULE-ICON-RESEARCH.md`）天然区分 `filled/stroked`——`filled` 用于实心圆点/实心徽章（更醒目），`stroked` 用于空心圆/描边徽章（更轻盈），二者应随 `iconStyle` 一键切换。
- 优点：提升默认体验的精致度，不需要用户做任何配置。
- 缺点：要逐组件梳理"选中态"语义点，改动点分散（但每处都很小）。

### 推荐：A + B 组合

A 作为主题能力（品牌定制入口），B 作为组件内置约定（默认体验增强）。两者不冲突、可独立落地。若只做一件，**优先 B 的导航选中态 + A 的主题开关**，其余语义点迭代补齐。

## 落地计划（待确认后实施）

1. 归一化面性集 → `packages/uikit-im/src/assets/icons-filled/`（复用 prepare 脚本规则，产物提交入库）。
2. `icon-map.ts` 支持双注册表；`EmIcon` 按 `themeStore.iconStyle` 选表 + 缺失回落线性。
3. 主题配置新增 `iconStyle`（`store/theme.ts` / `use-theme.ts` / `uikit-provider.vue` 的 `theme` prop），demo 外观面板加切换开关。
4. 组件选中态配对（导航选中、多选圈、已读态等），逐点接入。
5. 同步 `apps/docs/guide/icons.md`；`icon.story.vue` 增加双风格对照展示。

## 风险与注意

- **语义一致性核对**：接入前逐个核对面性与线性同名图形语义一致（设计师命名已对齐，抽查看过 `pin`/`bell`/`rect/hanzi` 等均一致，但全量接入时应再过一遍网格图）。
- **回落清单固化**：把 32 个纯线条 name 的回落写成显式逻辑（filled 表查不到即回落），不要隐式 miss 告警刷日志。
- **体积口径**：发版前在 build 产物里确认 icons-filled 的实际增量。
- **文档同步**：`icons.md` 目前描述的是"线性集为主 + Lucide 兜底"，接入面性后需补充双风格说明与 `iconStyle` 配置示例。
