# 设计稿 token 对照与落地口径（2026-09 设计师整改沉淀）

> 背景：2026-09 设计师给出一份 UIKit 整改意见（SCSS Design Token + Typography 系统 + 会话组件族）。
> 经逐项辩证评估，结论：目标基本已由 `--uikit-*` CSS 变量体系覆盖（且是超集），真正落地的是
> 「语义层级组件化 + 局部规格校准」。本文记录对照关系与落地口径，供后续设计对接复用。

## 一、明确不引入的项（含理由）

| 设计师建议 | 不引入理由 |
| --- | --- |
| SCSS 变量（`$color-*`）+ `styles/` 目录 | 本库零 sass 依赖；SCSS 变量编译期固化，不支持暗色与运行时换肤。`--uikit-*` CSS 变量契约（`packages/uikit-core/src/theme/index.css`）是其超集。 |
| 27 个 `.text-{level}-{weight}` 工具类 | 本库不用原子工具类（UnoCSS 为死配置，见 skill `uikit-styling-theming`）；组件样式走 `<style scoped>` + BEM。 |
| Inter + Google Fonts 网络加载（400/500/600） | 国内可达性差；库不应给接入方强加网络字体依赖。**2026-09-03 修订**：字体名本身已落地——`--uikit-font-family` 栈首声明 `'Inter'`（拉丁）/ `'Noto Sans SC'`（中文，对齐设计师 Value.tokens.json），本机未装自动回落系统字体栈；webfont 加载仍由接入方/demo 自决。 |
| `src/components/base|conversation` 目录结构 | 单包应用思路；本库是 monorepo：原子组件在 `uikit-core/src/components`，业务块在 `uikit-im/src/modules`，容器在 `uikit-im/src/containers`。 |

## 二、设计色板 ↔ token 对照表

| 设计稿 | 落地 token | 说明 |
| --- | --- | --- |
| `#171A1C` 主文字 | `--uikit-text-primary` | 含暗色覆盖；**2026-09-16 已校准**（原 `#111827`） |
| `#5E686E` 次要文字 | `--uikit-text-secondary` | **2026-09-16 已校准**（原 `#6b7280`） |
| `#919BA1` 辅助文字 | `--uikit-text-tertiary` | **2026-09-16 已校准**（原 `#9ca3af`） |
| `#FFFFFF` 反白文字 | `--uikit-text-inverse` | 恒白（badge/按钮等） |
| `#FAFAFA` 页面/列表底 | `--uikit-conversation-list-bg` | 2026-09 新增，暗色 `#1E2123` |
| `#F5F5F5` 列表项 hover | `--uikit-bg-hover` | 由 `#e5e7eb` 校准 |
| `#E5F5FF` 列表项选中 | `--uikit-bg-active`（主色 12% 叠白） | **不写死 hex**：调 alpha 命中稿值，保留跟随主色能力 |
| `#F0F0F0` 分割线 | `--uikit-border-light` / `--uikit-divider-color` | |
| `#FF7070` 未读红点 | `--uikit-badge-bg` | 2026-09 新增，独立于 danger 语义色 |
| `#949A9E` 弱化图标 | `--uikit-icon-muted` | 由 `#B6B8BF` 校准 |
| `#AA9EE8` 文字头像底 | Avatar 组件内生成逻辑 | 非 token，实现方式不同 |
| `#E6E6E6` / `#BDBDBD` 空态占位 | `--uikit-empty-icon-color` / `--uikit-empty-text-color` | 2026-09 新增，暗色 `#464E53` / `#737B82` |

## 三、Typography 对照

2026-09-03 第二轮：设计师输出 Figma 变量导出 `Value.tokens.json`（字体族 CHN=Noto Sans SC / alphabet=Inter，
字重 400/500/600/700，字号 9 档 h0=34 / h1=28 / h2=22 / h3=18 / body-lg=16 / body=14 / caption=12 / small=10 / mini=8，
行高逐档绝对值配对 42/34/26/24/24/22/18/14/12）。落地口径：

- **字体族**：栈首声明制（见第一节修订行），不引网络字体。
- **字重**：与 `--uikit-font-weight-regular/medium/semibold/bold` 完全一致，零改动。
- **字号**：22/18/16/14/12/10/8 既有 `--uikit-font-size-*` 全覆盖；补 `--uikit-font-size-28` / `-34` 两档（明暗两段，× `--uikit-font-scale`）。
- **行高**：稿值绝对 px 不照抄（与适老缩放冲突），换算为按档配对的 `calc(Npx × --uikit-font-scale)`。
- **层级载体**：9 档 + 补 `body-sm`（13px，沿用旧 Body-S）落地为原子组件 `EmText`（`level/weight/color/ellipsis/tag`，
  `packages/uikit-core/src/components/text/`），文档站 `theme#排版层级` 表同步改新命名（旧命名对照见表注）——TECH-DEBT D127 关闭。

## 四、已落地的规格校准（2026-09，im 3.2.0 / core 2.3.0）

- **Badge 六档**：xs（仅 8px 圆点）/ s / m / l（默认）/ xl / xxl；`placement` + `bordered`；`BadgeSize` 枚举破坏性变更。
- **会话项排版**：用户名 16px/600、时间 12px tertiary、预览 14px、行距 6px；置顶底色 = hover 色；
  置顶/免打扰面性图标（`filled/pin` / `filled/bell/slash`）+ 摇动动画 + `--uikit-icon-muted` 同色。
- **未读点规格**：数字 → 16px 红色胶囊；免打扰/dot → 8×8 `#FF7070`（去除历史「免打扰染灰」）。
- **会话列表 variant**：`card`（默认，圆角白卡有间距）/ `compact`（无圆角无分割线零间距），
  容器根作用域覆写 Cell 变量实现（手法见 skill `uikit-styling-theming`）。
- **空态**：会话列表 `list/bullet` 图标 100×100 占位色 + 16px 文案 + 垂直居中；聊天区 `bubble/rect/2` + 「选择一个会话」。
- **ChatContainer 容器档位（2026-09-03）**：`variant`（`compact` 默认平铺 / `card` 圆角卡片）与会话列表同口径迁移——card 档容器自绘圆角（跟随 `--uikit-components-radius`）+ 细边框（`--uikit-border-light`）+ overflow 裁剪，灰底与间距由宿主布局提供；此前该卡片壳由 demo 宿主手搓（`demo-layout__main`），现已收回容器内，demo 在 card 档下退化为纯定位壳。chat 默认保持 `compact` 不破坏存量接入（会话列表默认 card 是列表内部样式变更，chat card 会新增可见边框/圆角，故保守默认）。
- **消息气泡整改（2026-09-03，im 3.4.0 / core 2.5.0）**：① 圆角两档位 `bubbleShape` round=16px（默认）/ square=8px（原 12px/4px），token `--uikit-bubble-radius` / `--uikit-bubble-radius-square`，全类型气泡 + 引用卡片（0.75 倍：round 12px 更椭圆 / square 6px 保持原样）接入；② 气泡默认色：对方 `#E4E6E7`/`#171A1C`、己方 `#009EFF`/`#FFFFFF`（己方不再跟随主色，`setBubbleBg`/预设仍可覆盖）；③ 译文/语音转文字并入原气泡，1px 分割线分隔（`--uikit-bubble-divider-other/self`）；④ 中性气泡（对方）`bubbleStyle` 两模式：filled（默认带底色）/ plain（无底色纯文字，message-list 根作用域覆写 `--uikit-bubble-bg-other: transparent`）；⑤ 消息状态默认位置 `below` → `inline`（气泡末尾、与气泡底部对齐）。

## 五、未落地项（见 TECH-DEBT）

- D128 avatar-only 72px 折叠会话栏；
- D129 Badge s/m 档字号偏差待设计确认；D130 compact 密度档排版偏挤待验证。

## 六、对接流程建议（下次设计给稿时）

1. 先查本文对照表与文档站 `design-tokens` / `theme#排版层级`——稿值大概率已有 token。
2. 新色值一律先进 `theme/index.css`（`:root` + 暗色段），能表达为既有 token 的函数（主色透明度叠白等）就不新增字面量。
3. 组件规格冲突时以「几何可行性 + 主题能力」回推稿子（例：10px 高徽标塞不进 12px 字）。
