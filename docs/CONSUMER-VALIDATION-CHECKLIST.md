# 消费者验证清单（Consumer Validation Checklist）

> 创建日期：2026-08-15。目标：在**独立 Vue3 工程**中以「下游接入者」身份验证 `@easemob-community/uikit-im` 是否够好用。
> 背景：仓库内 `apps/demo` 走 vite alias 直连源码（`packages/uikit-im/src`），验证的是**功能对不对**；本清单在**只消费发布产物（tgz / npm）**的干净工程中逐项打勾，验证的是**接入顺不顺**。
> 记录方式：每项勾选后写「结果 / 卡点 / 建议」；发现的卡点回灌根 [TECH-DEBT.md](../TECH-DEBT.md)，文档缺口回灌 `apps/docs`。
> 关联：构建/发布事实见 skill `uikit-release-build`；Demo 工程模式见 skill `uikit-demo-development`。

---

## 阶段 A：发版前产物自检（本周完成，不必等下周 Demo）

### A1. 包内容自检

- [ ] `pnpm -F @easemob-community/uikit-im pack --dry-run`：确认包内只有 `dist/`，无 `.map` / `node_modules` / 多余文件（`files: ["dist"]` 白名单生效）。
- [ ] `exports` 四条子路径全部可 resolve：`.` / `./resolver` / `./auto-imports` / `./theme`。
- [ ] `dist/theme/index.css` 在包内，且是构建产物（非 src 拷贝）。

### A2. 独立工程 tgz 冒烟（关键：不要在 workspace alias 模式下测）

仓库外新建最小 Vue3 工程（create-vue 默认模板），只依赖发布产物：

- [ ] `npm i <uikit-tgz>`（或 registry 安装）后 `vite dev` 可启动、首屏无报错。
- [ ] 全量引入：`import UIKit from '@easemob-community/uikit-im'` + `app.use(UIKit)` 后组件渲染**有样式**。
- [ ] ⚠️ **主题样式引入方式**：验证 `quickstart.md:18` 的声明「入口已内置主题样式，接入后无需单独引入 CSS」是否成立。
  - 现状证据（2026-08-15 核查）：lib 构建 `cssCodeSplit: false` 把 CSS 提取为独立 `theme/index.css`，`dist/easemob-uikit-im.js` 内**无任何 CSS 导入**；demo 自身也是靠 `apps/demo/src/main.ts:5` 的 `import '@easemob-community/uikit-im/theme'` 引入的。→ **大概率消费者必须手动引 `@easemob-community/uikit-im/theme`**，若属实需修 quickstart 文档与 README。
  - 记录：不引 theme.css 时组件是否无样式？引了之后是否正常？
- [ ] 按需引入：`unplugin-vue-components` + `EasemobUIKitResolver` 组合下 `Em*` 组件可用、样式仍生效。
- [ ] `vite build` 成功，无 peer 依赖版本冲突告警（vue `^3.3.0` / pinia `^2.1.0` 与宿主项目实际版本组合）。
- [ ] UMD 产物（`easemob-uikit-im.umd.cjs`）：非构建环境（CDN script 标签 + `app.use(EasemobUIKit)`）可用。

### A3. 验证流程固化（可选，建议做）

- [ ] 把「切 tgz → 独立工程冒烟 → 切回源码」做成一条命令/脚本，避免手工改。
  - 现状问题：`AGENTS.md` 记录 demo 处于 tgz 临时验证模式，但 `apps/demo/vite.config.ts` 的 alias 仍开着、依赖是 `workspace:*`（实际是源码模式）；根目录 `easemob-uikit-im-1.6.0.tgz` 落后于当前版本 1.9.0。模式描述与实际状态不一致，需统一。

---

## 阶段 B：下周 Demo 验证清单（独立消费者工程中逐项打勾）

### B1. 接入成本（从零到第一个会话页）

- [ ] 安装 → 配 `EmUIKitProvider`（appKey / features / dataSource / connectionCallbacks / theme / h5）→ 渲染会话列表 → 进入单聊 → 收发消息，**完整链路共多少步、多少行代码、涉及几个概念**？记录耗时与困惑点。
- [ ] 对照 [快速开始](../apps/docs/guide/quickstart.md) 逐行复制，确认文档步骤与真实行为一致（含上面的 theme 引入问题）。
- [ ] 中英文切换（`useLocale` / locale）后文案是否完整、无 key 名裸奔（关联 TECH-DEBT D9：`t()` 缺 key 返回 key 名本身、部分组件硬编码中文）。

### B2. 契约一致性（docs vs 实现）

- [ ] Demo 用到的每个组件 props/emits，对照 `apps/docs` 的 gen:api 表格核一遍（改公开 API 后 docs 是否同步重新生成）。
- [ ] 文档中「已支持」但实际是占位/未生效的能力：已知 `h5.fontScale` 纯占位（D35），查一遍还有没有别的。
- [ ] 文档示例代码是否可直接复制到真实项目跑通（在线演练场 playground 验证过的示例优先）。

### B3. 边界场景（真实项目必踩）

| 场景 | 验证动作 | 关联 |
|---|---|---|
| token 过期 / 续期 | 接 `connectionCallbacks.onTokenWillExpire / onTokenExpired`（`use-uikit.ts:113`），业务侧刷新 token 后是否自动恢复 | D64（疑似已实现但 TECH-DEBT 未勾选，本轮**首个验证项**） |
| 断线重连 | 断网 → 自动重连 → 当前用户/会话/消息状态是否恢复（`currentUser` 不丢） | D22（已修，需回归） |
| 后台标签未读 | 页面切后台收消息 → 未读是否保留；切回前台才清零 | D63（未修） |
| 多端同步 | 另一台设备发消息/已读/撤回，本端实时性 | — |
| H5 键盘/安全区 | iOS 输入框聚焦是否被缩放（14px 触发自动缩放）、键盘顶起是否正确、底部安全区 | D54（未修）/ h5 适配 |
| 移动端输入 | 富文本在移动端是否被静默降级 simple、配置是否被忽略 | D77（未修） |
| 运行期改配置 | 运行中切换 `:h5` / `features` / `dataSource` 是否即时生效 | D81（`safeArea` 非响应式，未修）/ D31（已修，回归） |

### B4. 打包与运行环境

- [ ] 记录全量引入 vs 按需引入的产物体积与首屏差异（留数据，将来写进 README/文档）。
- [ ] SSR 预渲染（Nuxt / Vitepress）是否可运行：已知 `use-h5-adaptation.ts:97-99` 的 `useEventListener(window, ...)` 无 `typeof window` 守卫，SSR 会崩（D21 残留，未修）。若 Demo 不做 SSR，记录为「暂不支持，文档标注」。
- [ ] 多个 UIKit 实例 / 组件卸载重挂（路由切换）是否泄漏、重复监听（回归 D13-D16 已修项）。

### B5. 排障体验

- [ ] 接入遇错时日志能否定位问题：`utils/logger.ts` 分级/命名空间是否够用（D37，logger-binding 已存在，确认对外能力完整度）。
- [ ] 错误提示（toast / 错误码文案映射 `utils/sdk-error.ts`）在真实场景是否覆盖到位。
- [ ] 弹层/弹窗的关闭与可访问性（ESC / 遮罩 / focus）：D69 / D70 / D74 / D75 未修项是否影响 Demo 使用体感。

---

## 阶段 C：回灌机制（Demo 期间每天执行）

- [ ] 建立「体验日志」：每条卡点记 **现象 / 期望 / 实际 / 修复建议**。
- [ ] 日志逐条落进根 [TECH-DEBT.md](../TECH-DEBT.md)（复用现有条目格式，标来源「2026-08 消费者验证」），已勾选项顺手核销（如 D64）。
- [ ] 文档缺口（quickstart / 组件页 / API 表格）当日记入、集中修。
- [ ] Demo 结束产出一份「好不好用」结论：接入成本数据 + 卡点清单按优先级排序（P0 阻断 / P1 影响体验 / P2 优化）。

---

## 摇树验收（D122 决策 22，2026-08-31 执行）

**目标**：验证 SDK 适配层「按注入隔离」的摇树性质——4.x 消费者工程产物中搜不到 5.x 符号，5.x 工程产物中搜不到 4.x 符号。

**方法**：

- 五个包（`uikit-sdk-contract` → `uikit-sdk-websdk5` / `uikit-sdk-webim4` → `uikit-core` → `uikit-im`）全部重新 `pnpm -F <pkg> build` 后 `pnpm pack` 成 tgz（`workspace:*` 协议在包外不可解析，必须用 pack 产物而非 file: 直链）。
- 独立工程放 `tmp/tree-shaking-check/consumer5/` 与 `tmp/tree-shaking-check/consumer4/`（vite vanilla-ts 模板，只 import 不渲染）：entry 为 `import { EmUIKitProvider } from '@easemob-community/uikit-im'` + 对应子路径入口（`@easemob-community/uikit-im/websdk5` 或 `/webim4`）；consumer5 装 `file:` 引用根目录 `easemob-websdk-5.0.0.tgz`，consumer4 装 npm 公网 `easemob-websdk@4.24.2`。两侧 `npm install` 与 `vite build` 均一次成功；`npm ls` 确认 consumer4 仅装 4.24.2 + webim4 adapter，consumer5 仅装 5.0.0 + websdk5 adapter（**依赖级隔离已成立**——另一侧 SDK/adapter 物理上不在 node_modules 里）。
- 产物检查用 `grep -o <symbol> | wc -l` 统计命中数并逐个看上下文（minify 会重命名标识符，代码符号主要靠保留的字符串字面量/全局名/属性名判定）。

**结果**：

| 检查项 | consumer4（webim4 + SDK 4.24.2） | consumer5（websdk5 + SDK 5.0.0） | 判定 |
|---|---|---|---|
| `ChatClient`（5.x 类名） | **0** ✓ | 25（5.x SDK 错误消息字符串，如 `"ChatClient already initialized..."`） | 反向确认 5.x 已进包 ✓，4.x 侧无泄漏 ✓ |
| `WebIM`（4.x 全局名） | 1（`window.WebIM=` 挂全局代码，4.x SDK 自有） | **0** ✓ | 反向确认 4.x 已进包 ✓，5.x 侧无泄漏 ✓ |
| `Websdk5Adapter` / `Webim4Adapter`（adapter 类名） | 0 / 23 | 22 / 0 | 各自只打进了自己注入的 adapter ✓ |
| `uikit-sdk-websdk5`（包名字符串） | 2 命中，均为**文案字符串**：core sdk-log-capture 兜底警告 `"SDK log capture unavailable: @easemob-community/uikit-sdk-websdk5 not installed..."` + 适配器解析错误提示中的子路径示例 ``import '@easemob-community/uikit-im/websdk5'``，非代码引用 | 1（同款自有警告文案） | 仅提示文案，无 5.x 代码 ✓ |
| `uikit-sdk-webim4`（包名字符串） | 0 | **0** ✓ | ✓ |
| `Easemob` | 6，均为 4.x SDK 自有 webpack UMD 包装变量（`EasemobChat`）与 license 注释 | 2，均为 5.x 自有日志格式串 `"[Easemob] SDK version: ..."` | 各自 SDK 的自有内容，无交叉 ✓ |

**结论**：摇树验收**通过**。两侧产物均无对方 SDK/adapter 的任何代码符号；仅有的跨界命中是 core 层固定提示文案中的包名字符串（错误消息字面量，不构成代码引用，且对两侧文案对称存在）。产物体积参考：consumer4 单 chunk 1,459,523 B，consumer5 单 chunk 1,600,199 B。

---

## 附：真实项目必踩的 open 债速查（2026-08-15 状态）

| 条目 | 现象要点 | 优先级 |
|---|---|---|
| D64 | token 过期无对外回调——**核查：`connectionCallbacks` 疑似已实现**，Demo 首个验证项 | P0 验证 |
| D21 残留 | SSR 无 `typeof window` 守卫（`use-h5-adaptation.ts:97-99`） | P0（若 SSR 是目标） |
| D54 | 输入框 14px 触发 iOS 自动缩放 | P1（H5） |
| D35 | H5 集成体验：`conversation-select` 事件、`EmContactContainer` 导航、Popup max-height、`h5.fontScale` 占位 | P1（H5） |
| D63 | 会话切换即已读，不判断页面可见性 | P1 |
| D37 | 日志体系：`logger.ts` 能力薄，`logger-binding` 已存在，需核对外部可用性 | P1（排障体验） |
| D9 | i18n：硬编码中文 + `t()` 无插值 + 缺 key 返回 key 名 | P2 |
| D77 | 移动端强制 simple 输入，tiptap 配置被静默忽略 | P2 |
| D81 | `safeArea` 开关非响应式 | P2 |
| D69/D70/D74/D75/D76/D78/D80/D82/D83 | popup/emoji/a11y/滚动锁/安全区监听等小项 | P2-P3 |

> 暂缓（已有预研、与下周 Web Demo 无关）：D85 Electron 持久化（[ELECTRON-PERSISTENCE-RESEARCH.md](ELECTRON-PERSISTENCE-RESEARCH.md)）、D86 主题扩展（[THEME-CAPABILITY-REVIEW.md](THEME-CAPABILITY-REVIEW.md)）、D90 面性图标（[ICON-STYLE-SYSTEM-RESEARCH.md](ICON-STYLE-SYSTEM-RESEARCH.md)）、integrations/skills 与 `packages/mcp`（等真实接入反馈再定优先级）。
