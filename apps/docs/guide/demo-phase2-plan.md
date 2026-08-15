# Demo 优化第二期：配置演练场体系盘点（方向登记）

> 状态：**仅登记方向，未开始执行**（登记日期 2026-08-13）。
> 背景：一期已落地「消息列表演练场」（CHANGELOG 1.7.0），验证了 docs 交互式配置演示的完整链路；二期将该体系扩展为覆盖消息气泡、会话列表、输入框、群能力、原子组件与主题 token 的演练场矩阵。
> 登记时已核实各方向涉及组件与配置的现状（见各节「现状核实」），执行时直接引用，无需重复排查。

---

## 一、一期先例（可复用资产）

- **DocsConfigPanel**（`apps/docs/.vitepress/components/DocsConfigPanel.vue`）：声明式配置面板，支持互斥选项组 / 布尔开关 / 数字输入三类控件 + 问号 tip 浮层，docs 站点全局注册，为二期各演练场统一复用。
- **mock 注入模式**（`apps/docs/components/message-list/demo/playground/mock.ts`）：向 conversation / message store 直灌 mock 数据，在 `EmUIKitProvider(:auto-init="false")` 内免登录渲染；与 Histoire story 同一套模式（demo 经 DemoBlock 的 ClientOnly 包裹，不触碰 SSR）。
- **文档登记方式**：组件页内嵌 `<demo src="./demo/xxx.vue">` 块 + CHANGELOG「新增」段落登记。

---

## 二、二期方向清单

### 1. 单条消息气泡演练场（EmMessageBubbleWrapper）

- **目标组件**：`packages/uikit-im/src/modules/chat/message-item/message-bubble-wrapper.vue`（公开导出 `EmMessageBubbleWrapper`）。
- **覆盖能力**：
  - 多选态：`isMultiSelectMode` prop + `toggle-select` emit + 气泡复选框显隐；
  - 引用卡片：`ext.msgQuote` + `msgPreview` 驱动的 QuoteCard（气泡下方），含点击定位/闪烁（`requestLocate` / `locateRequest`）；
  - 状态组合：`messageStatus`（classic / capsule × inline / below × showText / direction）+ 群已读圆圈（`groupReadCount` / `requireGroupAck`）。
- **现状核实**：三类能力均已实现于 wrapper 内，演练场只需 mock 对应数据字段（`ext.msgQuote`、`groupReadCount`、多选模式状态）。
- **实现要点**：多选态由外部状态驱动（chat 容器内的多选模式），演练场需自建最小驱动（模拟进入/退出多选）；复用一期 mock 消息注入模式。
- **页面登记**：建议挂在 `components/message-list.md`（气泡属于消息列表子能力）或独立页。

### 2. 会话列表配置演练场

- **目标组件**：`packages/uikit-im/src/containers/conversation-container/conversation-container.vue`。
- **覆盖配置**（容器 **props** 驱动，非 ChatConfig 段，已核实全部存在）：
  - `showSenderName`（默认 true）、`unreadMode`（'count' | 'dot'）、`showHeader`（默认 true）、`showStatusBanner`（默认 true）、`tabs`（五类分栏 all / unread / atMe / single / group）、`showSearch`、`showScrollToTop`、`headerAlign`、`bodySticky` / `footerSticky` 等。
- **mock 会话列表注入**：`conversation-container.story.vue` 已有先例（mock 会话数据注入 store），docs 侧沿用该模式。
- **实现要点**：`tabs` 分栏切换与未读/@我计数需要 mock 会话数据携带 `unreadCount`、atMe 标记；注意切换 `showHeader` 时占位布局一致性。
- **页面登记**：挂在 `components/conversation-container.md`。

### 3. 输入框配置演练场

- **目标组件**：`packages/uikit-im/src/modules/chat/message-input/`（index / simple-input / rich-input / editing-bar）。
- **覆盖配置**（`ChatConfig.input`，已核实全部存在）：
  - `mode`（simple | rich）、`style`（feishu | wechat）、`features` 六开关（emoji / image / file / voice / video / mention）、`autoFocus`、`focusBorderColor`、`caretColor`、`selectionColor`、`showSendButton`、`resizable`、`expandable`。
- **硬约束**：`EmMessageInput` 依赖 Provider 上下文（`useChat()`），演练场必须套 `EmUIKitProvider` 渲染；无 SDK 连接时需 mock 发送通道（dataSource 接管或注入 mock 发送），否则发送类交互不可用。
- **待确认**：输入框无登录态下的 mock 渲染可行性（`sendMessage` 依赖 client 连接），执行前先做最小验证。
- **页面登记**：挂在 `components/chat-container.md` 或独立「输入框」页。

### 4. 群已读回执 / 群管理配置演练场

- **群已读回执**：`ChatConfig.groupReadReceipt`（`enabled` / `maxGroupSize`，已核实存在）；渲染位于 `message-bubble-wrapper`（`groupReadCount` / `requireGroupAck`）；mock 消息需携带 `groupReadCount` 以展示空心圈 / 数字 / 全读对勾三态。
- **群管理**：`ChatConfig.groupManagement`（已核实存在）：`displayMode`（drawer / modal 双形态对比）、`showMuteAll` / `showMuteList` / `showBlocklist` / `showAllowlist` / `showSharedFiles` / `showJoinRequests` 六入口开关。
- **实现要点**：群管理入口依赖群资料与成员角色（owner / admin）判断，mock 需伪造群角色数据；群已读与群管理可合并为一个「群能力」演练场页面。
- **页面登记**：挂在 `components/group-container.md` 或独立「群能力配置」页。

### 5. 原子组件交互 demo 增强（按需）

- **范围**：Avatar（shape 主题联动 / size 实时切换）、Badge（count / dot / status 类型切换）等基础组件交互式 demo。
- **现状**：`components/avatar.md`、`components/badge.md` 已有基础静态 demo，增强为 DocsConfigPanel 交互式。
- **原则**：按需推进，不追求全覆盖；优先增强二期演练场直接复用到的组件（Avatar / Badge / Switch 等）。

### 6. 主题 token 演练场

- **范围**：圆角 / 密度 / 字号（适老），关联根 `THEME-CAPABILITY-REVIEW.md`（TECH-DEBT D86）。
- **待确认**：D86 主题能力（字号 / 密度 / 适老 token）当前落地状态，演练场以实际已落地的 token 面为准，不提前引入未实现能力。
- **实现要点**：DocsConfigPanel 需扩展 CSS 变量类控件（或按 D86 结论的主题 token 面实现），实时改写 `--uikit-*` 变量预览效果。
- **页面登记**：挂在 `guide/theme.md` 或独立「主题演练场」页。

---

## 三、依赖与建议执行顺序

1. **会话列表配置演练场**：story 先例最成熟、纯 props 驱动，成本最低，可作为二期第一个落地项。
2. **输入框配置演练场**：Provider 上下文 mock 方案需先验证，风险最高，建议先做最小验证再排期。
3. **单条消息气泡演练场**：数据构造明确（quote / 多选 / 状态字段），依赖一期 mock 注入模式。
4. **群已读回执 / 群管理演练场**：依赖群角色 mock，与气泡演练场共享消息数据构造。
5. **原子组件交互 demo 增强**：按需穿插。
6. **主题 token 演练场**：依赖 D86 落地状态，最后排期。

---

## 四、待确认项（执行前逐项复核）

- 输入框无 SDK 登录态下的 mock 渲染 / 发送通道方案。
- 主题 token 演练场与 D86 的依赖关系（先复核 D86 落地状态，见根 `THEME-CAPABILITY-REVIEW.md`）。
- 各演练场页面登记位置（组件页内嵌 vs 独立页）与 docs sidebar 结构。
- 会话列表配置为容器 props（非 ChatConfig），演练场操作 props 即可，**无需改公开 API**；其余方向如需新增配置项，按 AGENTS 规则先说明影响面再改。

---

## 五、登记信息

- 本次仅登记方向，**未改动任何源码**（仅新增本文档 + sidebar 入口）。
- 执行时逐项对照根 `TECH-DEBT.md` 避免重复排查；每个演练场落地后按一期先例登记 CHANGELOG。
