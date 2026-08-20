## 2.1.0 (2026-08-19)


### 新增

- **Skeleton 骨架屏组件**：`@easemob/uikit-core` 新增 `EmSkeleton`，支持头像 + 文字行变体；会话/联系人/群组列表首次加载接入骨架屏，减少空白等待感。
- **Modal danger 变体**：`EmModal` 新增 `type?: 'default' | 'danger'`，危险操作确认按钮自动切换为 danger 语义；同步限制最大宽度与正文溢出滚动。
- **Toast 能力补全**：`EmToast` / `useToast` 新增 `closable`、`position`、`actionText`、 `#action` 插槽与 `duration=0` 不自动关闭；`show` 方法通过重载兼容旧签名与新签名。
- **Input error / readonly 态**：`EmInput` 新增 `error` / `error-message` / `readonly` props，支持表单校验失败视觉反馈与只读可复制状态。
- **Empty 空状态模板**：`EmEmpty` 扩展 `illustration` / `title` / `description` / `action` slot，统一会话/通讯录/群组/搜索无结果四类模板。

### 视觉与主题

- **全局焦点环**：`:focus-visible` 焦点环覆盖所有可交互元素，键盘导航可见，满足 WCAG 2.4.7。
- **间距阶梯**：新增 `--uikit-spacing-1~7`（4/8/12/16/24/32/48px），高频组件 padding/gap 映射到阶梯变量。
- **Type Scale 排版规范**：补齐 `--uikit-font-lineheight-*` / `--uikit-font-weight-*` / `--uikit-font-family`，文档输出 10 级排版层级表。
- **暗色对比度验证**：9 组文字×背景暗色组合按 WCAG 2.1 AA 验证通过，`text-tertiary` 由 `#6b7280` 提亮为 `#8a92a0`。
- **移动端触摸热区扩展**：`EmIconButton` 在触屏设备下扩展最小触摸区域至 44×44px，视觉尺寸保持不变。

### 文档站

- **Design Tokens 总览页**：新增 `guide/design-tokens.md`，按 Color/Type/Spacing/Radius/Elevation/Motion/Z-Index 分类展示全部 `--uikit-*` 变量。
- **图标总览**：`components/icon.md` 新增图标网格，支持分类筛选、搜索、点击复制 name。
- **z-index 设计层级表**：`guide/theme.md` 定义 Toast/Modal/Drawer/Popover/Sticky/内容层级区间。
- **动效可视化面板**：`guide/theme.md` 新增交互式动效演练场，演示 fade-scale 过渡、四种 easing 曲线、Ripple 与 scale-press。
- **H5 适配文档增强**：`guide/h5-adaptation.md` 补充断点系统、双栏布局规则、手势映射表、横屏/折叠屏适配、输入区布局规范。
- **组件使用建议**：Button/Input/IconButton/Cell/Modal 文档新增 Do/Don't 对比表。
- **设计原则**：`guide/theme.md` 提炼 5 条核心设计原则（变量优先、层级清晰、无障碍默认、移动端优先、一致优于花哨）。
- **图标与时间戳规范**：`guide/icons.md` 补充图标设计规范；`components/message-list.md` 补充时间戳策略建议。
- **更新日志三包拆分**：`guide/changelog.md` 改用自定义 `ChangelogTabs` 组件，按 `@easemob/uikit-im` / `@easemob/uikit-core` / `@easemob/uikit-chatroom` 三 tab 展示各包更新日志；构建时由根 `CHANGELOG.md` 自动拆分生成。
- **文档站导航重构**：顶部导航收敛为「首页 / 指南 / 组件 / GitHub」；左侧边栏按「开始 / 功能指南 / 设计系统 / H5 适配 / Demo 规划 / 更新日志」板块聚合，同一板块内只展示当前板块导航，消除 mix 感。
- **图标总览默认展开**：`IconGallery` 分类默认展开，进入图标/Design Tokens 页即可直接浏览全部图标。

### 关联技术债

- 已于 `TECH-DEBT.md` 登记 D104-D113 并勾选归档。

---

## 2.0.0 (2026-08-15)


### 视觉

- **线性图标集全新替换为设计师约定命名（v2）**：新增 `packages/uikit-core/src/assets/icons-v2/` 图标库，命名与设计师 svg 文件名 1:1（如 `chevron/down`、`file/pdf`、`person/single`）；`EmIcon` 支持通过 `name` 自动索引，业务代码已完成 300+ 处 name 替换。旧库仅保留空状态插画等少量缺口图标，待设计师补图后清理。
- **面性图标集接入**：新增 `packages/uikit-core/src/assets/icons-filled/` 图标库，在线状态 `PresenceSelector` / `Avatar` 已从旧 `presence/*` 切换为 `filled/circle/*` 图标。
- `IconGallery` 文档画廊改为展示 V2 + Filled 全部图标，并在 `apps/docs/guide/icons.md` 同步命名规则与业务映射。

### 重构

- **三包架构落地（P0.5 改名 + P1 抽核，里程碑级内部重构）**：
  - 包改名：`@easemob/uikit` → `@easemob/uikit-im`（纯改名，安装命令同步更新，为聊天室场景包让位命名空间）
  - 新增共享基座 `@easemob/uikit-core`（1.0.0，独立版本线）：
    - SDK 基座层：`UIKitClient` / `ManagerHost`（含 **`ChatRoomManager` 注册**，为聊天室场景包预留）/ wire 类型 / user-info & presence domain / 连接级事件 / notice 工具
    - Pinia stores：client / theme / user-info / presence
    - 共享 composables：`useClient` / `useTheme` / `useUserInfo` / `useOwnUserInfo` / `usePresence` / `useToast` / `useNotification` / H5 通用（`useH5Adaptation` / `useKeyboard` / `useLongPress` / `usePullRefresh` / `useViewport` / `useBottomSheet` / `useRipple`）/ 通用交互（`useKeyBindings` / `useResizable` / `useUIKitStorage`）
    - 24 个原子组件（Em* 基础组件集，含 story）+ theme CSS 变量（539 行）+ locale（含 `mergeLocaleMessages`，供场景包合并 i18n keys）+ constants + 通用 utils（logger / log-store / sdk-error / download / z-index / format-time / linkify）
    - core 版 `EmUIKitProvider` + `useCoreUIKitProvider` / `useProviderSideEffects`（场景无关共享副作用）
  - `@easemob/uikit-im` 全量 re-export core 符号：**对外 API 零回归**（原 416 个公共导出名全部保留，组件 props/emits、主题、文案、行为不变）
  - resolver / auto-imports 参数化生成（`gen-aux-entries.mjs`，各包一份产物，build 前置 `--check` 卡漂移）
  - 构建规则固化：所有包 external `vue`/`pinia`/`easemob-websdk`，场景包再 external core（消费端单 SDK 实例）；im UMD 产物补 core 全局映射（CDN 直引可用）
  - 版本同步：`changelog:check` 升级为 im / core 双版本校验（根 CHANGELOG 单一数据源不变）；im 依赖 core 采用 `workspace:^`（发布转 `^1.0.0`）
  - 日志导出文件名前缀参数化（`setLogFilePrefix`），im 既有 `easemob-uikit-im-logs-*` 语义不变
- **面向下游**：安装包名由 `@easemob/uikit` 变更为 `@easemob/uikit-im`；除此之外无任何 API / 行为变更，可直接替换依赖名升级。

---

## 1.9.0 (2026-08-14)


### 新增

- **流式消息（Stream Message）内核接入**：
  - `onStreamMessage` 按 `msgServerId` 幂等合并分片，`body.content` 以 `stream.fullText` 覆盖更新、不产生新气泡（分片先到时自动建气泡）
  - 纯文本流式状态内置：传输中尾部打字机光标、完成态收敛、异常态提示（`customType='text'` 或缺省）
  - 丢片补偿：离线/断连期间错过分片时，同步到达的完整消息自动覆盖未完成的流式副本，不留半截内容
  - 流式内容增长时消息列表在用户位于底部时自动跟随滚动；当前会话摘要随内容响应式更新
  - `UiMessage` 扩展可选 `stream?` 字段（复用 SDK `StreamMessageMeta`）；新增 `STREAM_MESSAGE_STATUS` / `STREAM_CUSTOM_TYPE` 常量
  - markdown 等富格式流式内容由 `#message-txt` 插槽插件接管渲染（内核不引入 markdown 依赖）
- **消息定位高亮增强**：点击 @名字定位该用户最近一条消息（`ChatConfig.textMessage.locateOnMentionClick`，默认开启），未找到时 toast 提示；定位高亮改为主题色边框 + 发光 + 背景着染，脉冲 3 次后静态保持再平滑淡出（2.4s），覆盖引用卡 / 置顶 / 搜索 / @我自动定位等全部入口
- **demo：AI 流式消息演示**：
  - 新增 markdown 流式气泡插件参考实现（`#message-txt` 接管 `customType='markdown'`，markdown-it 渲染 + 打字机光标 / 终态 / 异常）
  - 聊天工具栏新增「AI 流式演示」入口；设置抽屉新增「AI」分类面板（AI 应答 mock 开关、手动注入 markdown / 异常流式演示）
  - 新增流式分片模拟器与 mock AI 回复生成器（直接驱动 messageStore，完整走内核覆盖更新链路）
- **文档**：新增「AI 流式消息」章节（SDK 语义 / 内核能力 / markdown 插件接管示例 / AI 接入三模式与安全建议），`chat-container` 组件文档补充流式消息小节

---

## 1.8.0 (2026-08-13)


### 新增

- **二期配置演练场矩阵（docs 交互式演示，6 个方向全部落地）**：
  - **会话列表配置演练场**：`EmConversationContainer` 覆盖 `showSenderName` / `unreadMode`（count|dot）/ `showHeader` / 分栏 Tabs（五类预设）/ `showStatusBanner` / `showSearch` / `showScrollToTop` / `headerAlign` / `bodySticky`，mock 会话直灌免登录渲染
  - **输入框配置演练场**：`EmMessageInput` 覆盖 `mode`（simple|rich）/ `style`（feishu|wechat）/ features 六开关 / `autoFocus` / `focusBorderColor` / `caretColor` / `selectionColor` / `showSendButton` / `resizable` / `expandable`，输入回车或点发送可在下方消息列表回显
  - **单条消息气泡演练场**：`EmMessageBubbleWrapper` 覆盖多选态（自建进入/退出驱动）、引用卡片（ext.msgQuote + 定位闪烁）、状态组合（classic|capsule × inline|below × showText / direction）+ 群已读圆圈三态
  - **群已读回执 / 群管理演练场**：`ChatConfig.groupReadReceipt`（enabled / maxGroupSize）+ `EmGroupManagementSection`（drawer|modal 双形态 + 六入口开关），mock 群角色 owner/admin/member 实时切换视角
  - **原子组件交互 demo 增强**：Avatar（shape 主题联动 / size / presence 实时切换）与 Badge（count / max / dot / 状态颜色 / 尺寸 / 风格）升级为交互式配置演示
  - **主题 token 演练场**：实时调整品牌色相 / 组件圆角 / 字号档位（适老）/ 密度档位，会话列表即改即看；通过舞台局部 CSS 变量 + `data-uikit-density` 生效，不写入全局主题
- **在线代码演练场规模化（VuePlayground，@vue/repl 可编辑代码实时预览）**：
  - 基础设施增强：多文件模板约定（`App.vue` 主编辑区 + `mock.ts` mock 数据分离）；编辑内容按 `uikit-playground:<id>:v1` 本地持久化（刷新/切页自动恢复，「重置代码」清除缓存）；工具条新增「全屏」与「新标签打开」（`serialize()` → `public/playground.html` 独立页，全量走本地 vendor 产物）
  - **配置演练场与在线代码演练场合并**：DocsConfigPanel 面板式演练场全部并入在线代码演练场（config.vue 移除），页面只保留一个「在线代码演练场」小节；原面板配置项（会话容器 props / 输入框 config / 群管理配置 / Avatar / Badge 等）全部体现在模板的「可编辑配置」区，改代码即改即看
  - 演练场覆盖扩展至 8 个组件页：Avatar（shape 主题联动 / size / presence）、Badge（count/max/dot/状态色/尺寸/风格）、Button（type/size/disabled/loading/block）、Cell（title/meta/箭头/边框/尺寸/状态）、Input（形态/type/disabled/maxlength/clearable）、会话列表（容器 props + mock 会话）、聊天容器（`config.input` 配置 + mock 消息回显）、群能力（群管理入口 + 群已读回执三态，角色视角可切换）
  - 演练场预览样式修复：预览 iframe 改注入 uikit dist 构建产物 CSS（`dist/theme/index.css`，含全部组件样式），此前仅注入 `:root` 主题变量导致 iframe 内组件无样式

### 修复

- **`config.input.focusBorderColor` 配置接线**：该配置此前为孤儿配置（输入框聚焦边框一直使用主题主色），现经 v-bind 接通聚焦边框颜色，config 优先、未配置回落主题值
- **在线演练场「新标签打开」独立页白屏**：`sync:vendor` 将 @vue/repl 本体与 codemirror 编辑器分别打包成两个 bundle，共享 chunk 中的 `injectKeyProps` Symbol 在两处各求值一次，编辑器 `inject` 失配导致 setup 崩溃白屏；现合并为单一 `vendor/repl.js`（共享 chunk 单例），headless Chrome 实测无 hash / 带 hash（真实 serialize 格式）双链路均正常渲染

---

## 1.7.0 (2026-08-13)


### 新增

- **系统通知文案自定义与开关能力（noticeConfig）**：
  - 新增 `NOTICE_EVENT_TYPE` 事件枚举（19 类通知事件）与 `NoticeContext` / `NoticeConfig` 公开类型，所有群系统通知（群创建/成员进出/群主变更/禁言/公告等）统一流经结构化事件管线
  - `EmUIKitProvider` 新增 `notice-config` prop：`renderText` 自定义文案（回调接收事件类型 + 结构化参数 + 已本地化内置文案）、`filter` 条件过滤（返回 false 不上屏）、`disabledEvents` 直接禁用事件
  - 通知消息 `body` 携带 `eventType` / `params` 结构化元数据（字段可选，旧消息完全兼容）
  - `EmMessageRenderer` 新增 `#message-notice` 插槽，业务可完全接管通知渲染
  - 新增文档页「系统通知文案定制」；demo 设置面板新增「系统通知文案」验收开关（内置/俏皮话术/关闭入群通知）
- **demo 恢复源码直连模式**：vite alias 直连 packages/uikit-im 源码，依赖声明改回 workspace 模式
- **消息列表演练场（docs 交互式配置演示）**：
  - 新增 DocsConfigPanel 声明式配置面板（互斥选项组 / 布尔开关 / 数字输入三类控件，问号 tip 浮层），docs 站点全局注册
  - 新增「消息列表 MessageList」演练场页面：mock 注入免登录渲染全类型消息，开关实时切换 `layout` / `showAvatar` / `showTime` / `bubbleShape` / `avatarSize` / `messageGap` / `messagePadding` / `messageStatus` 等配置
- **业务模块 API 文档自动生成**：
  - `gen-api-docs.mjs` 扩展 MODULES 白名单（chat-container / conversation-container / group-container / message-list），容器 Props 表格由生成器维护不再手写
  - `ChatConfig` 等嵌套配置类型递归展开为子表格（深度上限 3 层 + 去重，函数/联合/泛型类型显示原文）；成员说明取完整 JSDoc（多行说明不再截断）
  - 三个业务模块页手写 Props 段落替换为 `@include` 生成表格，后续改 API 重跑 `pnpm gen:api` 即可同步

### 优化

- **消息翻译 / 语音转文字交互重构**：
  - 操作菜单按状态切换：已有译文/转写时显示「取消翻译 / 显示译文」「收起文字 / 显示文字」，目标语言不一致时重新翻译；翻译/转写进行中禁用并显示 loading 文案
  - ActionSheet 支持 `disabled` / `icon` 透传；disabled 项点击统一弹「操作不可用」提示
  - 移除 toggleTranslation / toggleVoiceText 全局事件链，译文卡片隐藏/显示入口收敛到操作菜单；译文 loading 图标改用 spin 动画
- **Resizable 拖拽光标优化**：拖拽全程注入全局光标锁（`*` + `!important`），指针移出手柄或到达 min/max 边界时光标不再回落默认箭头，移除边界光标回落逻辑

### 修复

- **`config.messageList.bubbleShape` 配置接线**：该配置此前为孤儿配置（气泡一直读主题全局 `bubbleShape`），现经注入键接通文本/图片/语音/视频四个气泡组件，config 优先、未配置回落主题值

---

## 1.6.0 (2026-08-13)


### 重大变更

- **SDK 引入模式支持双模式**：
  - 默认（生产/发布）子包依赖 `easemob-websdk` 声明为 npm registry 版本 `^5.0.0-beta.1`（跟随 5.x 正式版与 beta 线，`pnpm sdk:up` 一键更新到 range 内最新），不再使用本地 tgz 相对路径（修复发布后消费者无法解析 `file:` 依赖的问题）
  - 本地 dev 联调可切换为仓库根目录 `easemob-websdk-5.0.0.tgz`：`pnpm sdk:use-tgz` / `pnpm sdk:use-npm` / `pnpm sdk:status`（切换后需 `pnpm install`），通过根 `package.json` 的 `pnpm.overrides` 实现，仅影响本地安装/构建，不影响发布

### 新增

- **Icon 内置动画能力**：
  - `anim` prop 支持 spin（旋转）/ pulse（脉冲）/ shake（摇摆）/ flash（闪烁）四种内置动画
  - 动画时长与曲线跟随主题动画 token（`--uikit-anim-duration` / `--uikit-anim-easing`），全局动画开关与 `prefers-reduced-motion` 自动生效
- **消息输入框展开/收起**：
  - PC 端输入框工具栏新增展开按钮，点击后输入区原地撑高至聊天容器 50% 高度（240~600px），Esc 或再次点击收起，内容与光标保留
  - 展开态自动隐藏拖拽手柄并关闭 emoji / @提及 锚点弹层（避免布局变化错位）
  - `ChatConfig.input` 新增 `expandable` 配置（默认 true），业务方可关闭
- **demo 设置面板说明增强**：新增 DemoSettingLabel 组件，10 个设置面板的选项补充用途说明文案
- **组件文档补充**：icon 组件页新增「动画」章节与演示 demo

### 优化

- **loading 图标统一收敛**：图片查看器 / 状态横幅 / 合并消息解析 / 消息搜索 / 会话列表同步 5 处 loading 统一改用 Icon `anim="spin"`，删除重复 keyframes，动画时长随主题
- **图标切换过渡**：消息状态图标（发送中→已读）、免打扰铃铛徽标、操作菜单图标切换增加淡入淡出过渡
- **免打扰铃铛动画主题化**：摇铃动画迁移到 Icon `anim="shake"`，全局动画关闭（`theme.animationEnabled`）时不再触发

### 工程

- **agent skills 补录**：新增 9 个开发协作 skill（消息渲染 / 聊天交互 / 插件与会话分栏 / Provider 配置 / 通知系统 / 打包发布 / demo 开发 / 文档站写作 / skill 编写规范），AGENTS.md 路由表同步登记
- **依赖升级**：vue 3.5 / vite 5.4 / vitepress 1.6.4 / typescript 5.9 等

---

## 1.5.1 (2026-08-07)


### 新增

- **图片预览组件 ImageViewer**：
  - 新增 `EmImageViewer` 图片预览组件：全屏浮层、loading 加载态、双击/滚轮/双指缩放（1~5 倍）、拖拽平移、90° 旋转、适应屏幕复位、下载与多图相册能力
  - 图片消息预览接入该组件：保留三级图片策略（缩略图/中图/原图）与失败降级编排，通过 `#footer` 插槽放置中图/原图切换按钮
  - 支持键盘操作（ESC 关闭、←/→ 切图）与 `v-model:show` / `v-model:index` 受控模式

### 修复

- 群消息已读详情自动翻页聚合全部已读成员，修复大群已读列表只返回首页的问题；已读回执按 50 条分批发送，规避 SDK 单次数量上限
- 群名补全增加去重与本地缓存，避免 SDK 定时同步会话列表时重复请求群信息；修复空群名回退导致的循环请求
- 群成员列表不再返回 admin 角色时，首屏单独拉取管理员列表并合并角色

---

## 1.5.0 (2026-08-06)


### 重大变更

- **同步 `easemob-websdk` 至 `0.20.32`（5.0.0 线）**：
  - 适配 `onMembersJoined` 事件 `groupName` 参数类型变更
  - 完整迁移说明见 1.4.0 版本的 SDK 5.0.0 升级记录

### 新增

- **会话分栏 tabs 能力**：会话列表支持按「全部 / 未读 / @我 / 单聊 / 群组」分栏展示
  - `ConversationContainer` / `ConversationList` 新增 `tabs`（自定义 tab 集合，顺序即渲染优先级，空数组隐藏）与 `activeTab`（支持 `v-model:active-tab`）props
  - 新增 `#tabs` 插槽：作用域提供 `tabs` / `activeTab` / `selectTab`，可完全接管 tab 栏渲染
  - 新增 `useConversationTabs` hook，半接管（绑定 props）与完全接管（插槽自绘）两种用法
  - 导出 `ConversationTabKey` / `DEFAULT_CONVERSATION_TABS` / `ConversationTabsSlotScope` 类型与常量
- **状态横幅 StatusBanner**：
  - 新增 `EmStatusBanner` 状态横幅组件：info / warning / error / success 四种类型、loading 旋转图标、可关闭（`v-model:show`）、自定义图标与插槽
  - 会话列表接入连接/同步状态横幅：断网（可点击，触发 reconnect 事件）、连接中、同步中自动展示，`show-status-banner` 可关闭，`#status-banner` 插槽可自定义
- **消息通知组件补齐**：
  - 新增 `EmNotification` / `EmNotificationContainer` 桌面端消息通知组件与 `useNotification` 状态单例
  - 同一会话短时间窗口内连续消息自动合并为一张卡片，unreadCount 累计展示
  - 容器支持 position（右上/左上/顶部居中）与 maxVisible（同时展示上限）配置
- **主题：字号 token 体系与适老版（Phase 2）**：
  - 新增 `--uikit-font-size-*` 字号 token 体系与 `--uikit-font-scale` 全局缩放
  - `setFontSize()` / `setFontSizeScale()` 支持标准 / 大 / 特大（适老版）切换
  - Phase 2.5 完成低频文件字号 token 化，Badge 适配字号缩放
- **主题：高频语义 token**：
  - 新增气泡色 / 聊天背景 / 输入区背景语义 token：`setBubbleBg` / `setChatBg` / `setInputBg`（Provider `bubbleColor` / `chatBg` / `inputBg` 声明式配置）
  - `setBubbleBg(null)` 支持重置为默认主题色
- **主题：密度（density）能力**：
  - 新增 Density 三档：compact 紧凑 / normal 标准 / comfortable 宽松
  - `useTheme` 新增 density 状态与 `setDensity()`；Provider 支持 `theme.density` 声明式配置
  - 密度变量覆盖 Cell 高度、内边距、列表间距、Header、输入区、气泡、抽屉与按钮

### 优化

- 时间分隔线与系统提示不再跟随气泡色，保持独立视觉层级
- 旧版 localStorage 缺少 fontSizeScale 时默认标准字号，避免迁移后异常放大
- 清理 D3 / D4 / D12 主题 token 漂移技术债
- Demo 外观面板增加语义 token 调试控件与单项恢复按钮
- 全仓库枚举字符串统一提取为 constants 常量，禁止业务代码硬编码

### 文档

- 新增 StatusBanner、Notification 组件文档页，文档站导航同步更新
- 会话容器文档增补分栏 tabs 能力、状态横幅与新增 props / 插槽说明
- 主题定制指南增补密度能力与语义 token 重置说明
- 沉淀三份预研文档（Electron 持久化、主题能力审查、Demo 开发者模式）

---

## 1.4.0 (2026-08-05)


### 重大变更

- **升级 `easemob-websdk` 至 `5.0.0`**：
  - 移除已废弃的 `GroupManager.getPublicGroupList` 调用
  - 新增错误码 222（单聊被拉黑）映射与多语言文案
  - 修复 `vite.config.ts` 中 SDK 版本读取，兼容新版包入口布局
  - 调整语音消息为 WAV 格式并优化语音转文字参数透传

### 新增

- **图片消息三级展示优化**：
  - 气泡统一优先展示缩略图最小图，点击展开中图，点击原图按钮再展示原图
  - 预览层中图/原图切换入口统一为底部按钮，文案明确点击结果（查看原图/查看中图）
  - 修复提示条与徽标点击穿透误关预览的问题（`pointer-events` 优先级）
- **消息引用卡片增强**：
  - 引用卡片去掉 emoji icon，图片/视频直接展示缩略图
  - 无图时兜底中文标签（由中文方括号【】改为英文方括号 []）
- **消息操作增强**：
  - 附件消息右键/长按菜单支持下载
  - 复制菜单仅对文本消息展示
- **群公告展示优化**：
  - 群描述弱化 + 群公告突出（横幅/历史/发布者）
  - 切换群聊会话时预拉群公告，避免必须展开抽屉才显示横幅
  - 移除本地缓存的公告历史/发布者/时间（SDK 5.0.0 无历史接口）
- **ID 一键复制能力**：全量支持 ID 一键复制
- **Chat header 优化**：群聊标题支持成员数后缀并优化单聊/群聊对齐配置
- **好友与群组事件通知**：在聊天页插入中性灰色通知
- **Plugin 扩展点补齐**：
  - 新增 `input-panel`、`message-action-extra`、`custom-message-action`、`useChatPlugin` 扩展点
  - 新增 `lastMessageTextResolver` 支持自定义最后一条消息文本
  - Demo 增加快捷回复与名片选择示例
- **Cell 组件增强**：支持 `insetHover=false` 卡片内操作项模式，群管理入口与群主操作行统一收敛到 EmCell
- **国际化增强**：
  - 新增 `findLocaleKey` 调试函数，支持单个/批量文案反查 locale key
  - 支持 `mergeLocaleMessages` 扩展业务语言包
  - 补齐名片消息多语言 key（sendCard/myCard/contactCard/noCardAvailable）
- **SDK 错误处理优化**：
  - 基于 SDK error code 优化核心 toast 错误提示
  - 使用 `isSDKError` + `formatSdkError` 统一 SDK 错误日志输出
- **字体统一**：在 `:root` 添加 `--uikit-font-family` 统一跨浏览器字体表现
- **邀请持久化增强**：修复通知入口不显示及默认值异常，增强邀请持久化与消息搜索能力
- **群已读回执**：点击会话批量补发群已读回执，统一置顶/引用展示链与按钮规范
- **UIKit 配置继承**：继承 SDK `deleteConversationOnGroupDestroyed` 初始化配置

### 优化

- **群管理 UI 统一**：
  - 群成员列表操作菜单改用 EmCell 卡片内操作项规范
  - 群管理入口改用 action 按钮，与群管理操作视觉完全对齐
  - 群管理入口 Cell 增加图标并与群管理操作样式对齐
  - 群信息抽屉「群管理操作」更名为「群主操作」
  - 移除群信息抽屉成员卡片的 hover 背景
- **群成员列表优化**：
  - 群成员二级列表卡片高度跟随内容，避免大面积留白
  - 群聊抽屉二级成员列表外层卡片圆角与一级一致
- **语音消息修复**：修复语音消息群已读圆圈位置异常，将 `max-width` 从根元素移至气泡本身
- **Demo 对齐**：群聊 header 不再展示头像，与 UIKit 默认行为一致

### 文档

- 新增 Demo 第一期 UIKIT 层能力评估规划文档
- 完善 VitePress 文档站与工程化细节
- 在图标页增加图标一览画廊，方便设计师查看全部内置图标
- 新增 ChatContainer Plugin 扩展点 Histoire story 文档
- 补全 VitePress 文档站点并修复 preview 启动失败

---

## 1.3.1 (2026-07-21)


### 变更

- 升级 `easemob-websdk` 至 `0.14.227`（本地包 `easemob-websdk-next-0.14.227.tgz`），迁移说明见 websdk2 仓库 `migration-guide-0.14.203-to-0.14.227.md`。
- 适配 SDK 0.14.224 事件行为变更：`recallMessage()` / `modifyMessage()` 成功后 SDK 不再在当前设备伪造 `onMessageRecalled` / `onMessageUpdated`，撤回与编辑改为在 await 成功后直接更新本地消息状态（`use-message-actions.ts`、`use-chat.ts`）；对端与多设备事件监听保持不变。
- 适配 SDK 0.14.223 事件行为变更：`pinMessage()` / `unpinMessage()` 成功后 SDK 不再在当前设备伪造 `onPinnedMessageChanged`，置顶操作后本地主动刷新置顶列表，保证 PinnedBar 同步（`use-message-actions.ts`）。

### 修复

- 适配 SDK 会话删除 API 变更：`DeleteConversationParams.deleteLocal` 已移除（SDK 删除会话成功后总会清理本地缓存）；`deleteConversationLocally` 已不存在，`removeConversation`（删除会话保留漫游消息）改为 `deleteConversation({ deleteRoamingMessages: false })` 并异步化（`conversation-domain.ts`、`use-conversation.ts`）。
- 适配 SDK 0.14.203 下载返回类型变更：群共享文件下载回调统一处理 `Blob | ArrayBuffer`，无 Blob 环境自动包装为 `Blob`（`group-domain.ts`）。

### 新增

- 群禁言列表项展示禁言到期时间（SDK 0.14.225 修复 v3 解析后返回 `muteExpire`）：永久 / 已到期 / 禁言至具体时间（`mute-list-item.vue`）。

---

## 1.3.0 (2026-07-07)


### 新增

- 接入 Presence 在线状态能力：
  - 新增 `PresenceDomain` 封装 SDK `PresenceManager` 的订阅、查询、发布能力。
  - 新增 `usePresence` 组合式函数，提供 `subscribePresence`、`fetchPresence`、`publishPresence`、`watch` 等 API。
  - 新增 `PresenceStore` 用于缓存在线状态，支持 `update` / `updateBatch` / `get`。
- 新增 Presence 相关组件：
  - `EmPresenceSelector`：在线状态选择器（在线 / 忙碌 / 离开 / 自定义）。
  - `EmPresenceSelectorModal`：弹窗形态的在线状态选择器，内部调用 `publishPresence`。
  - `EmPresenceAvatar`：传入 `userId` 即可自动订阅/拉取并展示在线状态，支持 `editable` 触发发布弹窗。
- `EmAvatar` 扩展：
  - 新增 `presence` prop，支持展示 `online` / `away` / `busy` / `offline` / `custom` 指示器。
  - 新增 `presenceSize` prop 自定义指示器尺寸。
  - 新增 `editable` prop 与 `presence-click` 事件，支持点击指示器触发状态编辑。
- 联系人/会话/群成员等列表组件接入在线状态展示：
  - `ContactList` / `ContactItem` / `ContactDetail` 支持在线状态点。
  - `ConversationList` / `ConversationItem` 单聊头像支持在线状态点。
  - `GroupMemberList` 支持懒加载可见成员的在线状态。
  - `UserCard` / `UserCardModal` 支持展示当前用户在线状态。
  - `MessageBubbleWrapper` 支持消息气泡头像展示发送者在线状态。
- 组件级 Presence 开关：
  - `ConversationContainer` / `ConversationList` 新增 `enablePresence` prop。
  - `ContactContainer` / `ContactListContainer` / `ContactList` 新增 `enablePresence` prop。
  - 优先级：组件 prop > Provider 全局 `features.enablePresence`。
- Provider 全局开关：
  - `UIKitProvider` 新增 `enablePresence` prop，默认 `false`。
  - `UIKitFeatures` 新增 `enablePresence`、`presenceStrangerMode`、`fetchGroupMemberPresenceOnVisible`。
- Demo 集成：
  - 默认开启 `enablePresence: true`。
  - 左侧导航栏顶部头像使用 `EmPresenceAvatar`，点击可发布在线状态。
- 新增 Histoire stories：
  - `Avatar` 新增 `Presence Sizes` variant。
  - 新增 `PresenceSelector`、`PresenceSelectorModal`、`PresenceAvatar` stories。
  - `ContactList` / `ConversationContainer` 新增 Presence 开启/关闭示例。

### 修复

- 修复 `Avatar` 方形模式下内部图片/文字缺少圆角的问题。
- 修复 `PresenceDomain.subscribe` / `fetchStatus` 成功后未写入 `PresenceStore` 的问题。
- 修复 `use-presence.ts` 中 `fetchPresence` 对 SDK `PresenceInfo.statusList` 的错误映射。
- 修复会话列表默认不主动获取在线状态的问题：进入会话列表时自动按可见单聊用户订阅 Presence。

---

## 1.2.0 (2026-07-04)


### 新增

- 新增群成员列表组件 `GroupMemberList`（公开名 `EmGroupMemberList`）：
  - 支持搜索、分页加载、角色标签（群主/管理员/成员）。
  - 支持对成员发起单聊、移除成员、设置/取消管理员（按当前用户角色自动判断权限）。
  - 通过 `Chat.vue` 的「查看全部成员」入口承接群信息抽屉，打开右侧抽屉展示成员列表。
- `Chat.vue` 新增 `showMemberList` 状态与成员列表抽屉，点击群信息抽屉的「查看全部成员」后可直接打开 `GroupMemberList`。
- `GroupDomain` / `useGroup` 新增群管理员能力：
  - `addGroupAdmin(groupId, userId)` / `removeGroupAdmin(groupId, userId)`
  - 操作成功后同步更新 `GroupStore` 中对应成员角色。
- `GroupStore` 新增 `updateGroupMemberRole(groupId, userId, role)`，用于本地即时更新成员角色。
- 新增好友申请通知列表组件 `ContactNoticeList`（公开名 `EmContactNoticeList`）：
  - 同时支持**好友申请**与**群组邀请**两种通知类型。
  - 针对已加入的群组或已成为好友的待处理邀请，会按「已接受」展示，避免无效操作。
  - 支持接受 / 拒绝操作，好友申请调用 `ContactManager`，群邀请调用 `GroupManager`。
  - 优化 item hover 与按钮边界：拒绝按钮使用白底描边，hover 时保持可见边界。
- `UiContactInvite` 类型扩展：新增 `id`、`type`、`groupId`、`groupName`、`inviterId`、`inviterName` 字段，统一描述好友申请与群组邀请。
- `ContactStore` 新增 `inviteList` 缓存与 `addInvite / removeInvite / updateInviteStatus / clearInvites` 方法，并新增 `pendingCount` 计算属性。
- `ContactDomain` 与 `contact-events.ts` 扩展好友申请事件处理：
  - `onContactInvited` 将申请存入 `inviteList`；若对方已是好友，则直接标记为 `accepted`。
  - `onContactAgreed` / `onContactRefuse` / `onContactAdded` / `onContactDeleted` 同步联系人及申请状态。
- `GroupDomain` / `useGroup` 新增群邀请处理能力：
  - `acceptGroupInvitation(groupId)` / `declineGroupInvitation(groupId)`
- `group-events.ts` 新增群邀请事件处理：
  - `onInvitationReceived` / `onInvitationAccepted` / `onInvitationDeclined` / `onAutoAcceptInvitationFromGroup` / `onMembersJoined` 自动维护 `inviteList` 状态。
- `ContactNoticeList` 新增 `persist` 配置：
  - `persist` 支持 `true` / 'local' / 'session'，开启后未处理通知自动持久化，刷新页面后仍可恢复。
- `AddressBookContainer` 新增 `noticePersistInvites` 配置：
  - 在容器层统一开启通知持久化，确保首页「通知」hot 红点在刷新后也能立即显示，无需先打开通知列表。
- 新增 `useInvitePersistence` 组合式函数，基于 `appKey + userId` 生成隔离存储 key，恢复时自动过滤已接受 / 已加入的邀请。
- `AddressBookContainer` 默认通知视图：
  - 通知徽标数未传入时自动取 **pending 数量**（`pendingCount`），仅统计未处理的好友申请与群邀请。
  - 「通知」入口徽标使用 **hot 红点徽章**（红底白字圆点），联系人 / 群组入口保持原有默认数字样式。
  - 徽标数字超过 99 显示 `99+`。
  - `notice` 视图默认渲染 `ContactNoticeList`，业务仍可通过 `#notice` 插槽覆盖。
- 修复聊天消息列表三个问题：
  1. **左侧边距消失（虚拟列表模式）**：`MessageVirtualList` 增加 `padding: 16px`，并给非最后一项增加 `padding-bottom: 12px`，与正常滚动列表的内外边距保持一致，避免消息贴边。
  1. **顶部加载完成后边距消失**：PC 顶部加载指示器在 `!hasMoreHistory` 时显示「没有更多历史消息」，保持顶部占位，避免加载指示器消失后布局下沉导致边距为 0 的错觉。
  2. **加载历史消息时新消息计数增加**：`messages.length` watch 改为通过 `lastMsgId` 区分「前置历史消息」和「底部追加新消息」，前置历史不再增加 `unreadNewCount`。
  3. **登录后只有几条新消息时无法触发加载历史**：进入会话后新增 `ensureHistoryFill`，当非虚拟列表且消息未撑满视口时自动加载历史，直到可滚动或没有更多历史。
  4. **加载历史触发时机**：普通滚动与虚拟滚动的 `reach-top` 阈值统一为 `scrollTop <= 0`，只在真正触顶时加载。

- 群聊输入框 @提及自动调起群内成员列表：
  - `Chat.vue` 在群聊会话下自动预加载群成员（本地为空时拉取第一页）。
  - 将当前群成员（排除自己）映射为 `MentionContact[]` 透传给 `MessageInput`。
  - `MessageInput` 新增 `mentionContacts` prop，传入后优先于 `config.input.mention.contacts` 使用。
  - 用户输入 `@` 时，`MentionPicker` 现在能展示群内成员并支持搜索、选中。
- 群信息抽屉「添加成员」按钮按群组邀请权限动态显示：
  - 群主/管理员始终显示。
  - 普通成员仅在 `group.allowInvites === true` 时显示。
  - 无权限时不展示按钮，避免触发 403。
- 邀请失败时增加 `group.inviteMember.forbidden` 文案：遇到 `forbidden` / `access forbidden` 错误提示「当前群组不允许邀请成员，请联系群主或管理员」。
- 群信息抽屉「添加成员」按钮样式修复：增加 `justify-content: center`、`line-height: 1` 与水平 padding，解决文案/图标不居中的问题。
- 新增 `InviteMemberModal` 组件，实现从联系人列表选择并邀请成员入群：
  - 邀请弹窗内联系人列表关闭字母导航与分组标题，改为平铺列表，避免右侧字母条溢出/挤压弹窗。

  - 弹窗居中展示（移动端底部抽屉），支持多选联系人。
  - 已在群中的成员和当前登录用户自动禁用，避免重复邀请。
  - 支持搜索联系人，底部显示「取消 / 邀请」按钮。
  - `Chat.vue` 在群信息抽屉点击「添加成员」时打开该弹窗，邀请成功后提示并刷新成员列表。
- `GroupMemberList` 新增 `allow-chat` 配置（`'all' | 'contact' | 'none'`）：
  - `'all'`：对所有成员（除自己外）显示「发消息」按钮。
  - `'contact'`：仅对联系人列表中的成员显示「发消息」按钮。
  - `'none'`：不显示「发消息」按钮。
  - `ChatConfig` 新增 `groupMember.allowChat`，`Chat.vue` 会自动透传给成员列表弹窗。
- 新增 `GroupMemberList` Storybook 示例：「仅联系人可发消息」与「禁止发消息」。
- 新增 `contact.*` 与 `group.memberList.*` 系列国际化文案（好友申请、群邀请、群成员列表、管理员操作等）。
- 新增 `ContactNoticeList`、`GroupMemberList` 与 `AddressBookContainer` 的 Storybook 示例。

### 优化

- 群信息抽屉的成员预览区交互升级：
  - 点击成员头像区域或「查看全部成员」按钮，改为居中 Modal 弹窗展示完整成员列表，避免抽屉套抽屉。
  - `GroupMemberList` 新增 `closable` 属性与 `close` 事件，支持在弹窗标题栏显示关闭按钮。
  - 弹窗宽度 480px、高度 70vh（移动端 90vw×80vh），内部列表独立滚动，保留搜索、角色标签、发消息/设管理员/移除等操作。

### 修复

- 修复会话列表切换/更新时名称先显示 ID 再显示名称的闪烁问题：
  - `onConversationListUpdate` 改为合并更新，优先保留本地已补全的名称/头像，避免 SDK 把 `conversationName` 回退成 `conversationId`。
  - `onSyncDataFinished` 的 conversation 分支也使用合并策略保留已补全名称。
- 修复会话列表中群聊只显示群组 ID 的问题：
  - 在 `onSyncDataFinished`（conversation / contact / group）和 `onConversationListUpdate` 之后，使用群组列表、联系人备注/名称、用户资料昵称补全会话名称。
  - 若本地没有对应群组信息，会主动调用 `groupManager.getGroupInfoList` 拉取群详情，进一步兜底补全群名称。
- 修复会话列表搜索不支持中文备注 / 群名 / 昵称的问题：
  - 默认搜索现在会同时匹配会话 ID、会话名、最后一条消息、单聊联系人备注/名称/用户资料昵称、群聊群名称。
  - 仍可通过 `filterFn` 自定义搜索逻辑。
- 修复发送视频消息失败的问题：
  - 原实现调用 `sendVideoMessage(file, 0, ...)` 时 duration 为 0，触发 websdk2 `ValidationError: duration must be positive`。
  - 现在通过 `<video>` 元素读取本地视频真实时长，读取失败时兜底为 1 秒，确保 duration 始终为正整数。

---

## 1.1.3 (2026-07-03)


### 新增

- 群信息抽屉（`ChatInfoDrawer`）从 mock 数据升级为真实群信息入口：
  - 展示群名称、头像、描述、公告、成员数。
  - 拉取并展示群成员列表（首页），区分群主/管理员/普通成员角色。
  - 提供「清空聊天记录」「退出群聊」「解散群聊（仅群主）」操作，并带二次确认弹窗。
  - 预留「查看全部成员」「添加成员」事件入口，下一期可接入群成员管理。
- `GroupDomain` / `useGroup` 新增群成员、群公告、转让群主、移除成员、邀请入群能力：
  - `fetchGroupMembers` / `fetchGroupAnnouncement` / `updateGroupAnnouncement`
  - `changeGroupOwner` / `removeGroupMembers` / `inviteUsersToGroup`
- `GroupStore` 新增群成员与群公告缓存，`group-events.ts` 事件已可自动同步更新。
- `ConversationDomain` / `useConversation` 新增 `clearChatHistory`，支持清空本地聊天记录并可选删除服务端漫游消息。
- `MessageStore` 新增 `clearConversationMessages` 用于清理指定会话本地消息缓存。
- 新增 `UiGroupMember` 类型与 `toUiGroupMember` 适配器。
- 新增 `chat.info.*` 系列国际化文案（群公告、群介绍、群主、管理员、成员、查看全部成员、添加成员、清空/退出/解散群聊等）。
- 新增 `ChatInfoDrawer` Storybook 示例（Group / SingleChat 两种 Variant）。

---

## 1.1.2 (2026-07-02)


### 新增

- `UIKitProvider` 新增 `enableUserInfo` 与 `enableUserInfoSubscription` props，业务可显式控制用户资料展示与陌生人资料变更订阅。
  - `enableUserInfo`：是否启用自动拉取/展示用户资料（昵称/头像），默认 `true`。
  - `enableUserInfoSubscription`：是否启用陌生人资料变更订阅，默认 `true`；服务端未开通时自动熔断并提示。
- 用户资料订阅无权限或服务未开通时，UIKIT 现在会通过内置 Toast 提示用户：
  - 中文："用户资料实时订阅未开通，陌生人资料变更不会自动更新，请联系管理员开通"。
  - 英文："User profile real-time subscription is not enabled. Stranger profile changes will not update automatically. Please contact the admin."。
  - 提示仅触发一次，避免刷屏。
- 撤回消息失败时增加分类 Toast 提示：
  - `message recall disabled` / 服务未开通：提示"消息撤回功能未开通，请联系管理员开通"。
  - 超过可撤回时间：提示"已超过可撤回时间，无法撤回"。
  - 其他失败：提示"撤回失败，请稍后重试"。
  - 失败仍会通过 `recall-failed` 事件透传，业务层可继续自定义处理。

### 文档

- 为 `UIKitProvider` Storybook 补充用户资料订阅配置示例（开启 / 关闭订阅两种 Variant）。

---

## 1.1.1 (2026-07-02)


### 新增

- 新增 `useOwnUserInfo()` 组合式函数，外层业务可方便地获取当前登录用户自己的昵称/头像：`const { userInfo, displayName, avatarUrl } = useOwnUserInfo()`。
  - 自动拉取当前用户资料并复用 UIKit 内部缓存。
  - 不调用陌生人资料订阅，避免在 demo 等未开通订阅权限的环境下产生额外请求。

### 修复

- 修复用户资料订阅在服务端未开通/无权限时产生大量 403 控制台警告的问题。
  - `UserInfoDomain.subscribeUserInfos` 现在会合并同一事件循环内的订阅请求，减少并发。
  - 检测到 `code === 210` / `httpStatus === 403` / `reason === 'service_forbidden'` 时自动熔断，后续不再发起订阅请求。
  - 失败用户 ID 会被缓存，避免反复重试；权限类错误仅 warn 一次，避免刷屏。
  - 新增 `UIKitFeatures.enableUserInfoSubscription` 开关，业务可主动关闭订阅。
- 修复聊天信息抽屉中备注编辑未接入 SDK 的问题。
  - 点击保存后调用 `contactManager.setContactRemark` 同步到服务端。
  - 备注保存成功后抽屉内名称、联系人列表、聊天 header、会话列表、消息气泡等使用 `remark` 的位置会自动刷新。
  - 修复联系人 store 备注更新未触发响应式的问题（`updateContactRemark` 改为生成新对象并替换数组项）。
  - 保存过程中按钮禁用并显示“保存中...”。
  - 新增 `chat.info.remarkSaveFailed` / `chat.info.saving` 国际化文案。
- 统一 UIKit 内用户昵称/头像展示优先级：
  - 单聊场景下统一按 **联系人备注（remark）> 用户资料昵称/头像（UserInfo）> 业务兜底名称/头像（会话/消息自带）> 用户 ID** 的顺序展示。
  - `useUserInfo()` 与 `useOwnUserInfo()` 的 `displayName` / `avatarUrl` 已纳入 `contact.remark` / `contact.avatar`。
  - 已覆盖位置：会话列表（`conversation-item`）、聊天窗口顶部 header（`chat`）、消息气泡发送者（`message-bubble-wrapper`）、聊天信息抽屉（`chat-info-drawer`）。
  - 群聊仍使用会话自身名称/头像，不受单聊资料优先级影响。

---

## 1.1.0 (2026-07-01)


### 新增

- H5 适配核心能力：新增 `useH5Adaptation()` 与 `UIKitProvider` 的 `h5` 配置，集中管理 viewport、安全区、软键盘高度、下拉刷新开关与字号缩放预留。
- 安全区接入：自动为 `chat-container`、`chat` header、`address-book-container` header/footer、`popup` bottom、`scroll-to-top`、`message-input` emoji sheet、`conversation-list` header/footer 增加安全区内边距。
- 键盘适配：`chat` 输入框 focus 时自动滚动消息列表到底部，避免软键盘遮挡最新消息。
- 下拉刷新：`<UIKitProvider :h5="{ pullRefresh: 'auto' }">` 可在触屏设备上自动开启。
- 长按交互：`useLongPress` 统一改用 vueuse `onLongPress`，增加 touchmove 阈值与长按时禁止 body 滚动，解决 H5 长按与页面滚动冲突。
- 动画 token 接入：`message-input` emoji sheet 等 H5 高频路径的过渡时长改接 `--uikit-anim-*` CSS 变量。

### 文档

- 新增 [H5 适配指南](/guide/h5-adaptation)。
- 更新根 `README.md`、`apps/docs/index.md` 与 `apps/docs/.vitepress/config.ts`。
- 新增 `.agent/skills/uikit-h5-adaptation/SKILL.md`，并更新 `AGENTS.md`、相关 skill 与 `TECH-DEBT.md`。
