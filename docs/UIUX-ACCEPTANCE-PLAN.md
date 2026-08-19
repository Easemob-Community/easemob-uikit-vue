# UI/UX 验收整改计划（UIKit 设计验收报告落地）

> 来源：2026-08-19 UI 验收两份文件：
> - 《VUEUIKit 设计验收报告.xlsx》——纯 UI/UX 视角，基准 WCAG 2.1 AA / Apple HIG / Material Design 3，加权 2.85 D+；
> - 《UIKit认知对齐.xlsx》——三大列表项（会话/消息/联系人）可配置项全览，设计-开发对接资料（无整改项，仅沉淀价值）。
> 验收基准为 v1.8.0 文档；仓库当前 2.0.0（1.9.0/2.0.0 为内部重构，对外 API 零回归，结论仍适用）。
> 本计划已逐条与当前源码/文档核实，**「实锤」栏标注的是 2.0.0 下的验证结果**，避免重复排查。
> 状态：**计划已产出，逐项实施中（勾选推进）**。建议实施时逐项登记 TECH-DEBT（D10x 区间）。

---

## 一、结论先行（核实结果，先看这节）

### 1. 实锤成立（2.0.0 下仍存在，优先做）

| # | 验收条目 | 核实证据（当前代码/文档） | 性质 |
|---|---|---|---|
| 1 | P0-8 文档准确性 | `apps/docs/index.md:7,23` 写「18 个原子组件」（实际 docs 32 个组件页 / core 23 个组件）；`apps/docs/guide/quickstart.md:43` 写 `<em-avatar :url="user.avatarUrl" />`，组件 prop 实为 `src` | 文档 bug，成本最低、收益最高 |
| 2 | P0-2 无 `:focus-visible` | 全库 grep 0 处 | 无障碍硬伤 |
| 3 | P0-1 触摸目标 < 44pt | `core/components/icon-button/icon-button.vue`：small=28×28 / medium=32×32 | 移动端可用性 |
| 4 | P0-5 Input 缺 error/readonly | `core/components/input/input.vue` 无这两态 | 表单核心状态缺失 |
| 5 | P0-9 无间距阶梯 | `core/theme/index.css` 仅 `--uikit-container-gap: 8px` 一个间距变量 | 规范缺口 |
| 6 | P0-4 无 Type Scale / 行高 / 字重 Token | 主题无 line-height / font-weight token，无排版层级规范 | 规范缺口 |
| 7 | P0-10 无 Skeleton；Empty 无插画 | 全库无 Skeleton；`empty.vue` 无 illustration | 组件缺失 |
| 8 | Modal 无 danger 变体 | `core/components/modal/modal.vue` 确认按钮仅 `type="primary"` | 组件能力缺失 |
| 9 | Toast 无 closable/action | `core/components/toast/toast.vue` 仅 duration 可配 | 组件能力缺失 |
| 10 | 无图标总览页 / Token 总览页 | docs 仅单组件页 + `guide/theme.md` | 文档/可发现性 |
| 11 | 暗色对比度未验证 | 技术层 `[data-uikit-theme=dark]` 完整；9 种文字×背景组合无验证报告 | 文档+验证 |
| 12 | 动效缺可视化演示 | `--uikit-anim-*` token 齐全、reduced-motion 已尊重（正面项） | 文档/演示 |

### 2. 有出入（实施前需复核，勿直接照做）

- **P0-7 图标 color 行为不一致**：验收说「填充式图标 color prop 不生效，需 `:style` 传色」。但 2.0.0 的 `core/components/icon/icon.vue` 已统一处理（描边图标 `stroke=currentColor` 改绑 `props.color`；填充图标 `fill = props.color`），且全库无硬编码 fill 的 SVG。**大概率已在 1.9.0/2.0.0 重构中修复，复核确认后此项直接关掉**，不再投入。
- **「实际 32 个组件」**：32 = docs 组件页数（含容器/模块）；core 原子组件实为 23 个。计划以「首页数字改为准确口径」为准，不纠结具体统计法。
- **优先级偏重**：若干 P0 实为**设计规范/文档缺口**（Token 总览、Type Scale、间距阶梯、暗色截图），非代码缺陷。本计划按「可用性硬伤 > 组件能力 > 规范体系 > 体验增强」重新排序。

### 3. 认知对齐表的沉淀价值（非整改项）

《UIKit认知对齐》的术语对照表（Conversation/Contact/UserInfo/Presence/marks/remindType 防混淆）质量高，建议后续并入 docs 术语章节或作为组件文档附录，避免散落在 Excel。

---

## 二、Phase 1 · 修硬伤（低投入高价值，建议 1 周内）

> 目标：消除会误导用户 / 触碰无障碍红线的问题。全部为实锤项，验证门禁：`vue-tsc --noEmit` + `build` + docs build。

### [ ] P1-1. 文档准确性修复（对应 P0-8 / V-20）

- **现状**：首页「18 个原子组件」过时；QuickStart 头像示例 `:url` → 应为 `:src`。
- **改动**：
  - `apps/docs/index.md`：组件数量改准确口径，按功能分组描述（基础/反馈/数据展示 + 业务容器）。
  - `apps/docs/guide/quickstart.md:43`：`<em-avatar :url="user.avatarUrl" />` → `<em-avatar :src="user.avatarUrl" />`。
  - 全站 grep 其他 `em-avatar.*url=` 误用（含 demo 块、@include 片段）。
- **验收**：grep 无 `<em-avatar[^>]*:url` 残留；首页数字与 docs 组件页数一致。
- **关联 skill**：`uikit-docs-authoring`

### [ ] P1-2. 全局 focus-visible 焦点环（对应 P0-2 / V-19 / G-03）

- **现状**：全库无可交互元素的 `:focus-visible` 样式，键盘用户无法定位焦点（WCAG 2.4.7）。
- **改动**：`core/theme/index.css` 新增 `--uikit-focus-ring-color`（默认主色）+ 全局
  `:focus-visible { outline: 2px solid var(--uikit-focus-ring-color); outline-offset: 2px; }`；
  覆盖 Button / Input / IconButton / Cell / 各列表项等所有可交互组件，确保组件内 `outline: none` 处不吞掉焦点环。
- **验收**：Tab 键遍历 demo 页面所有可交互元素可见焦点环；`vue-tsc` + build 通过。
- **关联 skill**：`uikit-styling-theming` / `uikit-component-authoring`

### [ ] P1-3. 移动端触摸热区扩展（对应 P0-1 / I-15 / 交互-15）

- **现状**：IconButton small=28 / medium=32 px，低于 HIG 44pt 与 MD 48dp。
- **改动**：**视觉尺寸不变**，H5 适配层为 IconButton 扩展热区（`::after` 或 padding 扩展 min 触摸区域 ≥44×44px，`@media (hover: none)` / H5 模式生效）；同步检查 Badge、消息操作按钮、列表项右滑操作等高频小目标。
- **验收**：H5 模式下小按钮实际可点区域 ≥44×44；PC 视觉尺寸不变；demo H5 页面走查。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-component-authoring`

### [ ] P1-4. Input error / readonly 态（对应 P0-5 / I-02 / G-06）

- **现状**：Input 仅 default/focus/disabled/clearable 四态，表单校验失败无感知。
- **改动**：`core/components/input/input.vue` 新增：
  - `error?: boolean` / `errorMessage?: string`：红色边框 + 右侧错误图标 + 下方错误文案（`--uikit-danger-color`）；
  - `readonly?: boolean`：灰底但文字可选中复制。
- **验收**：组件 story 补 error/readonly 演示；`vue-tsc` + build 通过。
- **关联 skill**：`uikit-component-authoring`

### [ ] P1-5. 暗色模式对比度验证（对应 P0-3 / V-05 / V-06 / G-02）

- **现状**：dark 模式技术完整，但 9 种（text-primary/secondary/tertiary × bg-base/secondary/elevated）组合对比度未验证，文档无暗色截图。
- **改动**：
  - 用工具逐组测算对比度（正文 ≥4.5:1，≥18px 大文字 ≥3:1），不达标则调 `theme/index.css` dark 段色值；
  - docs 主题页补 light/dark 并排预览截图（或切换按钮）；组件文档页补暗色切换。
- **验收**：输出 9 组对比度数值表（含 dark 模式）；全部达标或记录豁免理由。
- **关联 skill**：`uikit-styling-theming` / `uikit-docs-authoring`

---

## 三、Phase 2 · 组件能力补全（2-3 周）

> 目标：补验收报告中实锤的组件能力缺口，均为 core 包新增/扩展（对外 API 注意兼容）。

### [ ] P2-1. Modal danger 变体（对应 I-08 / 组件走查 Modal）

- **现状**：确认按钮仅 `type="primary"`，删除等危险操作无红色确认。
- **改动**：`<em-modal>` 新增 `type?: 'default' | 'danger'`，danger 时确认按钮自动 `type="danger"`；补最大宽度与内容溢出滚动规范（`--uikit-popup-padding` 文档化）。
- **验收**：story 补 danger 演示；API 表格自动同步。
- **关联 skill**：`uikit-component-authoring` / `uikit-docs-authoring`

### [ ] P2-2. Toast 能力补全（对应 I-06 / 组件走查 Toast）

- **现状**：仅 type/duration（默认 2000ms），不支持手动关闭、操作按钮、位置配置。
- **改动**：`<em-toast>` 新增 `closable?: boolean`、可选 `action` 插槽/按钮（撤销/查看，点击后回调）、`position` 可选值；`use-toast` 单例同步支持；duration=0 表示不自动关闭。
- **验收**：story 覆盖 closable/action/position；`vue-tsc` + build。
- **关联 skill**：`uikit-component-authoring` / `uikit-store-composable`

### [ ] P2-3. Skeleton 骨架屏组件（对应 P0-10 / I-10）

- **现状**：列表首次加载仅 loading 转圈，无骨架屏。
- **改动**：core 新增 `<em-skeleton>`（头像 + 文字行变体，`--uikit-bg-hover` 或新增 shimmer token，尊重 reduced-motion）；会话/联系人/群组列表首次加载接入。
- **验收**：组件 story + 列表接入演示；build 通过；resolver/auto-imports 经 `aux:gen` 同步。
- **关联 skill**：`uikit-component-authoring` / `uikit-release-build`（aux 生成）

### [ ] P2-4. 空状态统一模板（对应 P0-10 / I-09 / G-07）

- **现状**：`<em-empty>` 存在但无插画/行动按钮，各容器空态文案不统一。
- **改动**：`<em-empty>` 扩展 `illustration`（默认线描插画）/ `title` / `description` / `action` slot；为会话/通讯录/群组/搜索无结果各出一套模板。
- **验收**：story 展示 4 种场景模板；API 表格同步。
- **关联 skill**：`uikit-component-authoring`

### [ ] P2-5. 图标 color 行为复核（对应 P0-7 / V-17，先复核再定）

- **现状**：2.0.0 源码已统一 fill/stroke 绑定（icon.vue），疑已修复。
- **动作**：① 用 filled 图标（如 `assets/icons-v2/archive.svg` 等无 stroke 集合）实测 `<em-icon color>` 是否生效；② 生效则此条**关闭**，仅在 docs 补一句说明（描边/填充均可 color prop 改色）；③ 若仍有 edge case（某图标 path 硬编码色值）则逐个修 SVG。
- **验收**：全量图标改色实测一致；无需为 filled 保留 `:style` 特例。
- **关联 skill**：`uikit-component-authoring`

---

## 四、Phase 3 · 设计规范体系（3-4 周，可并行）

> 目标：把「设计系统成熟度」补齐。多为 docs/规范产出 + 少量 token 扩展。此阶段同时是《UIKit认知对齐》沉淀的落点。

### [ ] P3-1. 间距阶梯（对应 P0-9 / V-11 / G-04）

- **改动**：`theme/index.css` 新增 `--uikit-spacing-1~7`（4/8/12/16/24/32/48px），标注用途（紧凑/组件内/组件间/区块间/页面间）；`data-uikit-density` 映射不同基准；高频组件（Cell padding、列表 gap、气泡间距）改用阶梯变量。
- **验收**：Token 表 + 组件抽样验证间距跟随阶梯。
- **关联 skill**：`uikit-styling-theming`

### [ ] P3-2. Type Scale 排版规范（对应 P0-4 / V-09 / G-01）

- **改动**：输出 10 级排版表（Display/H1-H4/Body-L/M/S/Caption/Overline，每级 Token+字号+行高+字重+颜色+用途）；新增 `--uikit-font-lineheight-*`、`--uikit-font-weight-*`、`--uikit-font-family`（建议 `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif`）；与现有 `--uikit-font-size-10~22` 对齐。
- **验收**：docs 新增「排版规范」章节；组件标题/正文/说明抽样落到层级。
- **关联 skill**：`uikit-styling-theming` / `uikit-docs-authoring`

### [ ] P3-3. Design Tokens 总览页（对应 V-01 / V-15）

- **改动**：docs 新增「Design Tokens」独立页：按 Color/Type/Spacing/Radius/Elevation/Motion 分类，表格+可视化色块展示所有 `--uikit-*` 变量及默认值（浅/暗色并排）；同页可顺带做图标总览（网格 + 分类筛选 + 搜索 + 点击复制 name）。
- **验收**：token 页与 `theme/index.css` 自动/手动同步（建议 gen 脚本防漂移）；图标总览可浏览全部图标。
- **关联 skill**：`uikit-docs-authoring`

### [ ] P3-4. z-index 设计层级表（对应 P0-6 / V-14 / G-05）

- **现状**：技术层有全局分配器（`core/utils/z-index.ts` `nextZIndex`）+ Popup 默认 2000；缺设计规范。
- **改动**：docs 定义层级表：Toast(9999) > Modal(2000) > Drawer(1500) > Popover(1000) > Sticky(100) > 内容(1)；核对各组件实际 z-index 落区间。
- **验收**：层级表入 docs；多弹层叠加场景实测不互相遮挡。
- **关联 skill**：`uikit-docs-authoring` / `uikit-component-authoring`

---

## 五、Phase 4 · 体验与文档完善（5-8 周，按需）

> 目标：达到成熟设计系统水准。验收报告中评级 OK 的正面项不重复投入。

### [ ] P4-1. 动效可视化面板（对应 I-11 / G-13）

- **改动**：docs 主题页加动效演示面板（enter/leave、三种 easing 曲线对比、Ripple、scale-press），并可一键关停（联动 `--uikit-anim-enabled`）。
- **验收**：演示面板可交互；与 `theme/index.css` anim token 一致。
- **关联 skill**：`uikit-docs-authoring` / `uikit-styling-theming`

### [ ] P4-2. 移动端手势映射表 + 断点系统（对应 I-16 / I-18 / G-08 / G-12）

- **改动**：docs 输出手势映射表（长按消息→ActionSheet、图片→双指缩放/单击关闭/长按保存等）；定义断点 sm<640/md<768/lg<1024/xl<1280，≥768 双栏布局规则，补充横屏/折叠屏适配说明。
- **验收**：文档齐全；如排期允许给会话列表+聊天页双栏布局补 demo。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-docs-authoring`

### [ ] P4-3. 组件 Do/Don't 指南 + 设计原则（对应 G-14 / G-15）

- **改动**：高频组件页（Button/Input/IconButton/Cell/Modal）补正确/错误用法对比；docs 输出 3-5 条核心设计原则作为模糊场景决策依据。
- **验收**：组件页样例达标。
- **关联 skill**：`uikit-docs-authoring`

### [ ] P4-4. 其余 P2 项按需排期（可裁剪）

- 语义色 50-900 色阶（V-04）；圆角/阴影阶梯 4/8/12/16/999 + sm/md/lg/xl（V-12/V-13/G-09/G-10）；Presence 色盲双编码验证（V-07）；图标设计规范（描边/端点/画布，V-16）；Notification 已读操作（I-07）；链接 visited 态样式（I-05）；输入区布局规范（I-20）；草稿/typing 视觉（I-21）；时间戳策略建议（I-22）。**均为 P2，无硬伤，按团队目标取舍**。

---

## 六、实施约定

- **包边界**：组件/Token 改动按三包归属（core 基础组件与 theme、im 业务模块），遵循 `uikit-package-boundary` skill；core 引擎层保持纯 TS 门禁。
- **验证门禁**：每项完成跑 `pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build`；docs 改动跑 docs build；新增组件记得 `aux:gen`（resolver/auto-imports）。
- **登记**：实施时逐项登记 TECH-DEBT（建议 D10x 区间），完成后勾选并在条目补「已于 <commit> 修复」；`TECH-DEBT.md` 其余条目不受影响。
- **对外 API**：Phase 2/3 涉及组件 props 新增，均为**向后兼容扩展**（新增可选 prop），不破坏既有 API；改前按 `uikit-component-authoring` 先说明影响面。
- **文档同步**：docs 组件页 API 表格经 `gen:api` 自动生成，组件改完需重跑；新增文档页登记 sidebar。
- **版本**：所有改动集中在 2.0.0 之后的下一个 minor（2.x），发版前跑 `pnpm changelog:check` 同步版本段。

## 七、进度追踪（勾选）

- [x] Phase 1：P1-1 文档准确性（已于 D104 修复）
- [x] Phase 1：P1-2 focus-visible（已于 D105 修复）
- [x] Phase 1：P1-3 触摸热区（已于 D106 修复）
- [x] Phase 1：P1-4 Input error（已于 D107 修复）
- [x] Phase 1：P1-5 暗色对比度（已于 D108 修复）
- [x] Phase 2：P2-1 Modal danger（已修复）
- [x] Phase 2：P2-2 Toast 补全（已修复）
- [x] Phase 2：P2-3 Skeleton（已修复）
- [x] Phase 2：P2-4 空状态模板（已修复）
- [x] Phase 2：P2-5 图标 color 复核（已复核，2.0.0 已修复，docs 补说明）
- [x] Phase 3：P3-1 间距阶梯（已修复）
- [x] Phase 3：P3-2 Type Scale（已修复）
- [x] Phase 3：P3-3 Token/图标总览页（已于 D112 修复）
- [x] Phase 3：P3-4 z-index 层级表（已修复）
- [x] Phase 4：P4-1 动效可视化（已于 D113 修复）
- [x] Phase 4：P4-2 手势/断点（已于 D113 修复）
- [x] Phase 4：P4-3 Do/Don't + 设计原则（已于 D113 修复）
- [x] Phase 4：P4-4 文档类补充项（图标规范 / 输入区布局 / 时间戳策略，其余 P2 项按需排期）
