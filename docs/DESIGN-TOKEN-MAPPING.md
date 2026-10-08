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
- **字号**（2026-09-18 起整体降一档，原 16px 档→15px，其余依次顺延）：28/22/20/18/16/15/14/13/12/11/10/9/8/7 全档 `--uikit-font-size-*` 覆盖（明暗两段，× `--uikit-font-scale`）；原 34px 最大档不再保留，新增 7px 最小档。
- **行高**：稿值绝对 px 不照抄（与适老缩放冲突），换算为按档配对的 `calc(Npx × --uikit-font-scale)`。
- **层级载体**：9 档 + 补 `body-sm`（13px，沿用旧 Body-S）落地为原子组件 `EmText`（`level/weight/color/ellipsis/tag`，
  `packages/uikit-core/src/components/text/`），文档站 `theme#排版层级` 表同步改新命名（旧命名对照见表注）——TECH-DEBT D127 关闭。

## 四、已落地的规格校准（2026-09，im 3.2.0 / core 2.3.0）

- **Badge 六档**：xs（仅 8px 圆点）/ s / m / l（默认）/ xl / xxl；`placement` + `bordered`；`BadgeSize` 枚举破坏性变更。
- **Avatar 徽标模式标准比例（2026-09-17，按 Figma「新-Demo」AvatarWithBadge 稿）**：徽标内置于 Avatar（`badge` / `badgeDot` / `badgeMax` / `badgePlacement` / `badgeColor`），尺寸随头像按比例换算（基准 48px）：数字徽标直径 = 头像 × 20/48（48→20）、红点 = × 9/48（48→9）、字号 = 徽标 × 12/20、多位数水平 padding = 徽标 × 4/20；2px 分界描边含在直径内（border-box，颜色走 `--uikit-bg-base`）；徽标中心内缩按形状分档（圆形 8/6px、方形 5/3px，均随头像尺寸等比）；会话项头像角标由「Badge 包裹 + ad-hoc transform 覆写」迁移至内置徽标。**presence 在线状态指示器按 Figma 1994:26192 校准**：Avatar Status 为**固定尺寸组件、无大小变体、不随头像缩放**——彩色核心 8px + 分界环 1.5px（总 11px），核心边缘距角 2px（整体收在角内不压边）；**分界环不涂刷颜色，而是对头像内容（图片/文字层）做 radial-gradient mask 镂空，环色 = 当地背景色**，选中/hover/暗色等任何背景下自动融合（覆盖原 `var(--uikit-bg-base)` 涂刷方案）；状态图标（`filled/circle/*`，24 模板圆盘占 20）上探 1.2 倍使圆盘填满核心；`presenceSize` 传入值为含环总直径。
- **会话项排版**：用户名 16px/600、时间 12px tertiary、预览 14px、行距 6px；置顶底色 = hover 色；
  置顶/免打扰面性图标（`filled/pin` / `filled/bell/slash`）+ 摇动动画 + `--uikit-icon-muted` 同色。
- **未读点规格**：数字 → 16px 红色胶囊；免打扰/dot → 8×8 `#FF7070`（去除历史「免打扰染灰」）。
- **会话列表 variant**：`card`（默认，圆角白卡有间距）/ `compact`（无圆角无分割线零间距），
  容器根作用域覆写 Cell 变量实现（手法见 skill `uikit-styling-theming`）。
- **空态**：会话列表 `list/bullet` 图标 100×100 占位色 + 16px 文案 + 垂直居中；聊天区 `bubble/rect/2` + 「选择一个会话」。
- **ChatContainer 容器档位（2026-09-03）**：`variant`（`compact` 默认平铺 / `card` 圆角卡片）与会话列表同口径迁移——card 档容器自绘圆角（跟随 `--uikit-components-radius`）+ 细边框（`--uikit-border-light`）+ overflow 裁剪，灰底与间距由宿主布局提供；此前该卡片壳由 demo 宿主手搓（`demo-layout__main`），现已收回容器内，demo 在 card 档下退化为纯定位壳。chat 默认保持 `compact` 不破坏存量接入（会话列表默认 card 是列表内部样式变更，chat card 会新增可见边框/圆角，故保守默认）。
- **消息气泡整改（2026-09-03，im 3.4.0 / core 2.5.0）**：① 圆角两档位 `bubbleShape` round=16px（默认）/ square=8px（原 12px/4px），token `--uikit-bubble-radius` / `--uikit-bubble-radius-square`，全类型气泡 + 引用卡片（0.75 倍：round 12px 更椭圆 / square 6px 保持原样）接入；② 气泡默认色：对方 `#E4E6E7`/`#171A1C`、己方 `#009EFF`/`#FFFFFF`（己方不再跟随主色，`setBubbleBg`/预设仍可覆盖）；③ 译文/语音转文字并入原气泡，1px 分割线分隔（`--uikit-bubble-divider-other/self`）；④ 中性气泡（对方）`bubbleStyle` 两模式：filled（默认带底色）/ plain（无底色纯文字，message-list 根作用域覆写 `--uikit-bubble-bg-other: transparent`）；⑤ 消息状态默认位置 `below` → `inline`（气泡末尾、与气泡底部对齐）。
- **聊天容器整改（2026-09-16，按 Figma「新-Demo」message-preview 稿）**：① 文字三色 token 校准为设计 neutral 色板（见第二节）；② header 加底部分隔线 + 8/12 padding、头像 40、标题 18/Medium、签名 14/lh18；③ 消息列表 normal 密度档改为 padding 12 / gap 16，消息行头像 32、气泡上昵称 10px Medium；④ 文本气泡 padding 12/14 + 正文 16px、译文 12px、已翻译 tag 10px/17px 图标；⑤ **语音转文字改回气泡外独立胶囊**（bg `--uikit-bubble-bg-other`、radius 12、padding 4/14、14px secondary）——覆盖 2026-09-03 决策③中语音部分（文本消息译文仍走气泡内分割线）；⑥ 文件卡片固定圆角 12（新 token `--uikit-file-card-radius`，不再随 bubbleShape）、宽 166–240 自适应、pdf 图标底色校准 `#DA3034`、大小文字接收侧 tertiary/发送侧新 token `--uikit-bubble-text-self-secondary: #EFEFEF`；⑦ 引用竖线 2px 新 token `--uikit-quote-line-color: #C9CDCF`、引用卡整行 14px 发送人 Medium；⑧ 系统消息/时间分割线 chip 化（`#E4E6E7`、radius 8、padding 2/8、12px lh16，2026-10 起 chip 底色 `--uikit-message-chip-bg` 解耦为独立中性 token，不再跟随对方气泡自定义色）；⑨ 群已读徽章色独立新 token `--uikit-msg-status-badge-color: #47ADEB`（不再跟随主色）、已读态 ✓ 用 tertiary；⑩ 输入框外层间距 4px、边框消费 `--uikit-input-border-color`（校准为 `#C9CDCF`）、工具栏图标 20/按钮 28、输入区 16px、初始内容高 78（卡片 88）、placeholder 走 tertiary。
- **消息输入卡片面暗色整改（2026-09-18，按 Figma「新-Demo」msg_input dark 稿 node 2008:4468）**：暗色与亮色规格不同——亮色维持「透明面 + 顶部光晕 + 主色 12% 内发光 focus」；暗色改为**实底 `--uikit-input-bg`（#1E2123）+ 1px #3C3F42 描边（新 token `--uikit-input-surface-border-color`，亮色 transparent、宽度恒定防布局抖动）+ 无顶部光晕（`--uikit-input-surface-sheen` 置零阴影占位，保 focus 逗号叠加合法）+ focus 改主色 20% 外环**（设计稿 literal `rgba(0,158,255,0.2)`，落地按 color-mix 派生 `--uikit-primary-color` 20%，与暗色强调惯例 #33B1FF 一致且跟随 `setPrimaryColor`）。卡片补 `box-sizing: border-box`，与 simple-input `CARD_CHROME_PX=18`（padding 16 + border 2）换算口径对齐。
- **消息输入卡片面恢复默认样式（2026-09-18，回退上述玻璃光晕方案）**：去掉「透明面 + 顶部蓝色内阴影光晕（sheen）+ focus 主色内发光/外环 + 独立 surface 描边 token」整套花活，恢复朴素默认样式——`--uikit-input-bg` 实底 + `--uikit-input-border-color` 1px 描边 + `--uikit-shadow-sm` 基础投影，focus 叠既有 `--uikit-input-focus-ring`（主色 20% 外环，token 保留在 theme/index.css:121）。`--uikit-input-surface-bg` / `-sheen` / `-border-color` / `--uikit-input-focus-glow` 四个 token 已从明暗两段移除；`input.focusBorderColor` 配置恢复「覆盖聚焦边框色」语义（原为生成同色内发光）。`box-sizing: border-box` 保留（simple-pc 126px 固定总高口径不变）。

## 五、未落地项（见 TECH-DEBT）

- D128 avatar-only 72px 折叠会话栏；
- D129 Badge s/m 档字号偏差待设计确认；D130 compact 密度档排版偏挤待验证。

## 六、对接流程建议（下次设计给稿时）

1. 先查本文对照表与文档站 `design-tokens` / `theme#排版层级`——稿值大概率已有 token。
2. 新色值一律先进 `theme/index.css`（`:root` + 暗色段），能表达为既有 token 的函数（主色透明度叠白等）就不新增字面量。
3. 组件规格冲突时以「几何可行性 + 主题能力」回推稿子（例：10px 高徽标塞不进 12px 字）。
