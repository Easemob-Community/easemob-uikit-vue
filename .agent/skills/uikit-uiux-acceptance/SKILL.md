# UIKit UI/UX 验收规范（设计验收 / 无障碍 / 组件形态 / 文档可发现性）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-uiux-acceptance**。

## 触发词

- `UIUX 验收` / `UI/UX 验收` / `设计验收` / `验收整改`
- `无障碍` / `a11y` / `WCAG` / `focus-visible` / `对比度`
- `触摸热区` / `44pt` / `48dp` / `H5 热区`
- `设计原则` / `Do/Don't` / `组件使用建议`
- `间距阶梯` / `Type Scale` / `Design Tokens` / `z-index 层级`
- `图标规范` / `图标总览` / `时间戳策略`

## 目标

在 `easemob-uikit-vue` 中新增或修改组件、主题、文档时，**避免重复踩 UI/UX 验收红线**。
本 skill 是验收规则的**总入口清单**，具体实现细节分散在 `uikit-styling-theming`、
`uikit-component-authoring`、`uikit-docs-authoring`、`uikit-h5-adaptation` 中。

1. 不遗漏无障碍硬伤（焦点环、对比度、reduced-motion）；
2. 组件形态符合设计系统（间距、字号、热区、语义色）；
3. 文档站保持可发现性（Token 总览、图标总览、Do/Don't、设计原则）；
4. 改完后按门禁验证，并登记 `TECH-DEBT.md`。

## 1. 验收清单（新增/修改时逐项核对）

### 1.1 无障碍（a11y）—— 底线，必须满足

| 检查项 | 标准 | 实现位置 | 验证方式 |
| --- | --- | --- | --- |
| 焦点环 | 所有可交互元素 `:focus-visible` 可见 | `packages/uikit-core/src/theme/index.css` 全局规则 + 组件不吞 outline | Tab 遍历 demo 页面 |
| 对比度 | 正文 ≥4.5:1，大文字 ≥3:1（WCAG 2.1 AA） | `theme/index.css` 明暗色值 | 对比度工具测算 |
| 动画 | 尊重 `prefers-reduced-motion`，全局可关 | `data-uikit-anim-enabled="false"` / `@media (prefers-reduced-motion: reduce)` | 切换动画开关实测 |
| 触摸热区 | H5 下可点击区域 ≥44×44px | `icon-button.vue` 等通过 `::after` / padding 扩展 | 浏览器 devtools 测量 |

> 新增可交互组件时，先在 `theme/index.css` 确认 `--uikit-focus-ring-color` 已覆盖；
> 若组件内写 `outline: none`，必须同时补 `:focus-visible` 样式。

### 1.2 组件形态 —— 走设计系统 token

| 检查项 | 规范 | 详情见 |
| --- | --- | --- |
| 颜色 | 禁止硬编码 hex/rgba；用 `var(--uikit-*)` | `uikit-styling-theming` |
| 间距 | 用 `--uikit-spacing-1~7` 阶梯，不手写 6px/10px/14px | `uikit-styling-theming` |
| 字号/行高/字重 | 用 Type Scale 层级（Display/H1-H4/Body-L/M/S/Caption/Overline） | `uikit-styling-theming` |
| 圆角 | 组件圆角走 `--uikit-components-radius`，hover 态走 `--uikit-components-radius-hover` | `uikit-styling-theming` |
| 动效 | 时长/缓动/缩放走 `--uikit-anim-*`，不硬编码 `0.2s` | `uikit-styling-theming` |
| 语义 | 危险操作用 `danger` 语义；成功/警告/信息用对应语义色 | `uikit-component-authoring` |
| 表单状态 | Input 必须支持 `error` / `readonly` / `disabled` 等完整状态 | `uikit-component-authoring` |

### 1.3 组件能力 —— 常见缺口

| 能力 | 规范 | 参考实现 |
| --- | --- | --- |
| Modal | 支持 `type="danger"`；限制最大宽度；正文可滚动 | `packages/uikit-core/src/components/modal/modal.vue` |
| Toast | 支持 `closable`、`position`、action、duration=0 | `packages/uikit-core/src/components/toast/toast.vue` |
| Empty | 提供插画 + title + description + action 模板 | `packages/uikit-core/src/components/empty/empty.vue` |
| Skeleton | 列表首次加载用骨架屏，尊重 reduced-motion | `packages/uikit-core/src/components/skeleton/skeleton.vue` |
| IconButton | H5 热区扩展；PC 视觉尺寸不变 | `packages/uikit-core/src/components/icon-button/icon-button.vue` |

### 1.4 文档站 —— 改完必须同步

| 检查项 | 规范 | 详情见 |
| --- | --- | --- |
| 新增组件 | 必须写 `components/<name>.md` + demo + sidebar 登记 + `gen:api` | `uikit-docs-authoring` |
| 新增 token | `theme/index.css` 与 `guide/design-tokens.md` 同步 | `uikit-docs-authoring` / `uikit-styling-theming` |
| 新增图标 | `guide/icons.md` 图标总览自动展示；SVG 符合规范 | `uikit-docs-authoring` |
| 高频组件 | Button/Input/IconButton/Cell/Modal 文档补 Do/Don't | `uikit-docs-authoring` |
| 主题页 | 保持 Design Tokens / z-index / Type Scale / 动效面板完整 | `uikit-docs-authoring` |

## 2. 验收来源与追踪

- **验收计划**：`docs/UIUX-ACCEPTANCE-PLAN.md` —— 本次整改的完整条目与进度。
- **技术债登记**：`TECH-DEBT.md` —— 实施时逐项登记 D10x 编号，修复后勾选归档。
- **设计原则**：`apps/docs/guide/theme.md` 开头 5 条核心原则，作为模糊场景决策依据。

## 3. 与现有 skill 的分工

本 skill 只给**清单和入口**，具体实现规则不重复展开：

- 样式/token/暗色/动画/图标着色 → `uikit-styling-theming`
- 组件 props/emits/导出/SVG 规范 → `uikit-component-authoring`
- 文档页/demo/API 表格/sidebar → `uikit-docs-authoring`
- H5 安全区/键盘/热区/手势 → `uikit-h5-adaptation`

## 4. 验证门禁

任何涉及 UI/UX 的改动完成后必须跑：

```bash
pnpm -F @easemob/uikit-im exec vue-tsc --noEmit
pnpm -F @easemob/uikit-im build
pnpm -F @easemob/uikit-core build
cd apps/docs && pnpm gen:api && pnpm build
```

新增/修改组件 props 后，必须跑 `pnpm -F @easemob/uikit-im aux:gen` 同步 resolver/auto-imports。

## 硬规则 vs 软约定

**硬规则**

- 新增可交互组件必须支持 `:focus-visible`。
- 新增颜色组合必须验证 WCAG 2.1 AA 对比度（正文 ≥4.5:1）。
- 新增动画必须接入 `--uikit-anim-*` token 并尊重 `prefers-reduced-motion`。
- H5 下触摸目标不得小于 44×44px。
- 新增/修改组件 props 必须同步文档、`gen:api`、sidebar。
- UI/UX 改动必须登记 `TECH-DEBT.md`。

**软约定**

- 优先扩展现有组件能力，不轻易新增组件。
- 文档站新增规范页时，按「表格 + 可视化 + 可交互 demo」组合呈现。
- 验收报告中的 P0/P1 项优先落地，P2 项按需排期。

## 已知漂移（改到相关文件时注意）

- `TECH-DEBT.md` D104-D113 记录本次 UI/UX 验收整改全部条目。
- `docs/UIUX-ACCEPTANCE-PLAN.md` 作为持续维护的验收计划，后续新验收报告可追加到该文件。
- `apps/docs/guide/theme.md` 的「设计原则」与「Design Tokens」页需要跟随 `theme/index.css` 同步更新。

## 反面清单

- ❌ 新增按钮/输入框/图标按钮不处理焦点环 —— 键盘用户无法定位。
- ❌ 新增文字色/背景色组合不验证对比度 —— 暗色下可能不可读。
- ❌ 动画时长写死 `0.2s` —— 绕开全局动画开关和 reduced-motion。
- ❌ H5 下图标按钮只有 28×28px 可点区域 —— 低于 HIG/MD 最低标准。
- ❌ 改完组件 props 不跑 `gen:api` —— API 表格过期。
- ❌ 新增 token 不更新 `guide/design-tokens.md` —— 文档与代码漂移。
- ❌ 验收整改不做 `TECH-DEBT` 登记 —— 后续无法追踪归档。
