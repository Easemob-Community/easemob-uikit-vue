## @easemob/uikit-core 2.8.4 (2026-09-18)


### 变更

- **`--uikit-sidebar-width` 默认值由固定 `360px` 改为弹性 `clamp(240px, 25%, 480px)`**：新增边界 token `--uikit-sidebar-min-width`（默认 240px）/ `--uikit-sidebar-max-width`（默认 480px），侧栏列表容器随宿主容器宽度伸缩；宿主覆写为 `100%` 或固定 px 的用法不受影响。

### 新增

- **`EmResizable` 新增 `fluid` prop**：fluid 且未拖拽过、无受控值时不写内联尺寸（由 CSS 决定），首次拖拽时测量根元素当前实际尺寸作为拖拽起点，拖拽后经 `update:model-value` / 内联 px 接管。

---

## @easemob/uikit-core 2.8.3 (2026-09-17)


### 新增

- **defaultFeatures 补齐昵称展示开关默认值**：`showNicknameInSingleChat` 默认 false、`showNicknameInGroupChat` 默认 true（契约字段定义见 uikit-sdk-contract 1.2.1）。

---

## @easemob/uikit-core 2.8.2 (2026-09-17)


### 修复

- **修复生产构建中 core 组件（按钮等）样式随 SFC 源码改动漂移失配的问题（严重）**：`@vitejs/plugin-vue` 4.x 生产构建的 scoped `data-v` hash = `hash(文件路径 + SFC 源码)`，任何 SFC 内容修改都会生成新 scopeId；而 `@easemob/uikit-im` 的 theme 内联的是 core dist 构建期固化的 scoped 样式，core 单独重构建（如 2.8.0 → 2.8.1 修改 EmButton）会使已发布的 im theme 里的 `data-v` 选择器全部失配，表现为消费方生产构建中按钮等 core 组件**失去全部样式**。修复：升级 `@vitejs/plugin-vue` 至 ^5.2.4 并统一启用 `features.componentIdGenerator: 'filepath'`，scoped hash 仅由文件路径决定、与源码内容无关，重复构建保持稳定；新增构建守卫 `scripts/check-theme-scope-ids.mjs`（core / uikit-im / uikit-chatroom 构建链接入），theme CSS 中出现运行时无法匹配的 scoped hash 时立即构建失败，杜绝再次静默产坏包。

---

## @easemob/uikit-core 2.8.1 (2026-09-16)


### 变更

- **`componentsShape` 方正档改为真直角（视觉变更）**：`square` 档 `--uikit-components-radius` 由 4px 改为 **0px**（`--uikit-components-radius-hover` 同步 10px → 0px）。原 4px 与圆润档 8px 在卡片 / 弹窗 / 按钮上肉眼几乎无差别，实测用户感知为开关失效；方正档现在呈现明确的直角风格（business 预设同步受影响）。同时清理 EmButton 中无人设置 `data-uikit-components-radius` 属性的失效 legacy 选择器（pill 按钮保持胶囊不受开关影响）。

---

## @easemob/uikit-core 2.8.0 (2026-09-16)


### 变更

- **新增全局 header 底部分隔线开关 `headerBorder`**：`themeStore.headerBorder`（持久化，默认 `false`）驱动新 token `--uikit-header-border-width`（`0px`/`1px`）；`ProviderThemeConfig` 新增 `headerBorder?: boolean`，`useTheme()` 新增 `headerBorder` / `setHeaderBorder()`。
- **EmModal `showHeaderDivider` 默认行为变化**：默认值由 `true` 改为「不传时跟随全局 `headerBorder` 开关（默认关闭）」，显式传 `true`/`false` 仍优先（沿用 Avatar `shape` 回落主题的惯例）。此前依赖默认显示 header 分割线的弹窗，需开启全局开关或显式 `:show-header-divider="true"`。

---

## @easemob/uikit-core 2.7.1 (2026-09-16)


### 变更

- **EmModal 度量对齐设计稿（视觉变更，无 API 变更）**：header 高 60px（`padding 13px 12px 13px 16px`，标题 18px/Medium）；body 默认 padding 24px → **56px 48px**、默认字号 14 → **18px**（`bodyFlush` 贴边形态不变，承接表单/穿梭/列表场景）；正文语义图标 56 → **72px**；footer 高 80px（`padding 16px 22px`，按钮间距 16 → 12）；外壳移除 1px 描边（设计稿仅阴影），圆角仍跟随 `--uikit-components-radius`、阴影走 `--uikit-shadow`。移动端 bottom-sheet 分支保持原有紧凑度量不受影响。

---

## @easemob/uikit-core 2.7.0 (2026-09-16)


### 变更

- **能力开关默认对齐产品化形态（行为变更）**：`defaultFeatures` 与 core `UIKitProvider` 的 `enableContact` / `enableBlocklist` / `enablePresence` 默认由 `false` 改为 `true`（此前 Provider 保守默认与 defaultFeatures 故意不一致，现对齐）；`usePresence` 关闭告警文案同步更新。presence 订阅有额外请求成本，私有化或低频场景显式关闭。

---

## @easemob/uikit-core 2.6.0 (2026-09-04)


### 新增

- **文件类型图标底色 token**：`--uikit-file-icon-{pdf,xls,doc,ppt,md,img,video,audio,file}` 品牌识别色（pdf `#E5252A` / xls `#1D7044` / doc `#2B5797` / ppt `#D24625` / md `#424242` / img `#00897B` / video `#E91E63` / audio `#7B1FA2` / 未识别普通文件 `#4CAF50`），明暗模式通用。

---

## @easemob/uikit-core 2.5.0 (2026-09-03)


### 新增

- **`EmText` 排版原子组件**（TECH-DEBT D127）：`level` 对齐设计师 Value.tokens.json 9 档（h0=34 / h1=28 / h2=22 / h3=18 / body-lg=16 / body=14 / caption=12 / small=10 / mini=8）并补 `body-sm`（13px）；每档内置「字号 + 行高」配对（行高按稿值换算为 `calc(Npx × --uikit-font-scale)`，跟随适老缩放）与默认字重；`weight`（regular / medium / semibold / bold）可覆盖默认字重，`color`（primary / secondary / tertiary / inverse）走语义 token，`ellipsis` 单行截断，`tag` 默认 `span`。新增后不全库回改，新代码用、老代码渐进迁移。
- **字号 token 补两档大标题**：`--uikit-font-size-28` / `--uikit-font-size-34`（明暗两段，× `--uikit-font-scale`）。
- **字体族栈首声明设计规范字体**：`--uikit-font-family` 栈首加 `'Inter'`（拉丁字形）/ `'Noto Sans SC'`（中文），本机未安装时自动回落 PingFang SC / 雅黑 / 思源黑体等系统字体栈；库不内置网络字体加载，需要精确字形时由接入方自行引入 webfont。
- **气泡语义 token 扩展与默认值校准（设计规范）**：新增 `--uikit-bubble-radius`（round 档 16px，默认）/ `--uikit-bubble-radius-square`（square 档 8px）与气泡内分割线 `--uikit-bubble-divider-other` / `--uikit-bubble-divider-self`（明暗两段）；气泡默认色校准为对方 `#E4E6E7` / `#171A1C`、己方 `#009EFF` / `#FFFFFF`（暗色段：对方沿用表面色与文字色，己方保持品牌蓝 `#009EFF`）。
- **`INJECTION_KEY.VOICE_UNREAD_DOT` 注入键**：语音未读红点开关的 provide/inject 通道（`ComputedRef<boolean | undefined>`，undefined 回落默认 true），支持消息项级深一层 provide 覆盖。

---

## @easemob/uikit-core 2.4.0 (2026-09-03)


### 新增

- **连接状态「被踢」账号态**：client store 新增 `kicked` / `kickCode` / `setKicked(code)`（`setConnected(true)` 与 `clearClient` 自动清除），供 UI 区分账号终态与网络异常。
- **列表项 hover 风格第三档 `square`**：`HoverStyle` 扩为 `'default' | 'rounded' | 'square'`（直角整行高亮，radius 归零）；`business` 预设默认改为 `square`；`theme/index.css` `:root` 补齐 `--uikit-item-hover-radius` / `--uikit-item-active-radius` / `--uikit-item-hover-margin-x` / `--uikit-item-hover-padding-x` 静态默认（8px，与 `default` 档一致），未接 themeStore 的场景不再缺变量。
- **Input `pill` 椭圆档**：显式 prop（border-radius 9999px、整体高度 36px、垂直 padding 8px），优先级高于主题 `componentsShape`；默认 `false` 保持圆角矩形。新增语义 token `--uikit-input-border-color`（default 变体边框，浅 `#F5F5F5` / 深 `#374151`）。
- locale 新增 `status.kickedAnotherDevice` / `status.kickedPasswordChanged` / `status.kickedDeviceLimit` / `status.kickedOffline`（中英双语）。

### 修复

- **Input 带前缀图标比例校准**：search/filled 变体下前缀图标左缩进 8px、文字 `padding-left` 28px（图标 8 + 图标宽 16 + 间距 4 的设计规格），修复图标过于靠左的问题（删除两条老的 `left: 4px` 覆盖）。

---

## @easemob/uikit-core 2.3.0 (2026-09-02)


### 新增

- **Badge 档位体系**：尺寸扩为六档 `xs`（仅 8px 圆点）/ `s` / `m` / `l`（默认）/ `xl` / `xxl`（单位数正圆、多位数药丸按规格表）；新增 `placement`（`top-right` 默认 / `bottom-right`）与 `bordered`（2px 描边与头像分界，`box-shadow` 外环实现、随背景色自适应、不与 stroked 描边冲突）；新增导出类型 `BadgePlacement`。
- **语义 token**：`--uikit-cell-bg`（Cell 项背景，默认透明，会话列表 card 变体覆写为浮层色）、`--uikit-conversation-list-bg`、`--uikit-empty-icon-color` / `--uikit-empty-text-color`、`--uikit-badge-bg`（徽标默认背景 `#FF7070`，独立于 danger 语义色）；新增图标 `list/bullet`，`filled/pin` 更换新版资源。

### 变更

- **token 默认值校准（对齐设计色板）**：`--uikit-bg-hover` 浅 `#e5e7eb` → `#F5F5F5`；`--uikit-bg-active` 浅色 alpha 0.08 → 0.12（≈ 主色 12% 叠白，视觉对齐 `#E5F5FF` 且保持跟随主色）；`--uikit-icon-muted` 浅 `#B6B8BF` → `#949A9E`。
- locale 默认文案：`conversation.empty`「暂无会话」→「没有会话」，`chat.empty`「请选择会话」→「选择一个会话」（en 同步为 `Select a conversation`）。

### 破坏性行为变更

- **`BadgeSize` 枚举重定义**：`'normal' | 'small'` → `'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'`，`size` prop 默认值 `'l'`；Badge 默认色由 `--uikit-danger-color` 改为 `--uikit-badge-bg`（`#FF7070`）。

---

## @easemob/uikit-core 2.2.0 (2026-09-02)


### 新增

- **`SdkConfig.persistence` 透传槽**：旁路写库钩子（`SdkPersistenceHooks`）随 `repositories` 同路经 core 归一化下沉 `adapterConfig` 下发 adapter（`resolved.persistence ?? adapterConfig.persistence` 归一），未注入时行为零变化。

---

## @easemob/uikit-core 2.1.0 (2026-09-02)


### 性能

- **日志持久化空闲零唤醒**：log-store 落库定时器由常驻 `setInterval` 改为 `setTimeout` 链，缓冲清空即停表，消除 Electron/长会话场景每 2s 空转唤醒。

### 行为变更

- **`usePresence` 增加开关硬门**：`subscribePresence`/`unsubscribePresence`/`fetchPresence`/`publishPresence`/`watch` 在 `features.enablePresence === false` 时全部 no-op（fetch 返回空数组），不再依赖各调用点自觉 gate；开启时行为不变。

---

## @easemob/uikit-core 2.0.0 (2026-09-02)


### 破坏性行为变更

- **SDK 装配改 adapter 驱动**：移除 `createClient` / `UIKitClient` / `ManagerHost` / `registerEventHandlers` 老路；`useCoreUIKitProvider` 重写为纯 adapter 驱动（init/login/logout/subscribe），业务 store 经 `adapterConfig.stores` 注入，事件依赖（i18n/通知）经 `adapterConfig.eventDeps` 注入；`onClientSetup` 替换为 `onAdapterReady`（logout/重初始化/卸载三处 dispose）。
- **引擎层隔离门禁**：core 引擎层（sdk/constants/utils）禁止 vue/pinia/@vueuse 与 `easemob-websdk` 的值 + 类型依赖（`check-engine-isolation.mjs`，构建前置）。

### 新增

- **dataSource 薄别名收口**：新增 `composables/data-source-repositories.ts`，把 `dataSource` 逐项翻译为 `SdkRepositoryOverrides` 注入 adapter Domain（惰性 getter 保持运行时切换语义，显式 `repositories` 按域整体优先）。
- `useSyncStatus` 下沉 core（onSyncStatus 桥接）；`formatSdkError` / `parsePresenceStatus` / `toUiMessage` 去 websdk5 依赖（鸭子类型判定）。

---

## @easemob/uikit-core 1.5.2 (2026-08-28)


### 调整

- **EmojiPicker「常用」区空时隐藏**：仅当有最近使用 emoji 时展示「常用」区；移除 `emoji.recentEmpty` i18n key。
- **移除 `emojiPreview` prop**：删除内置 emoji 悬停放大预览气泡（逻辑 + 样式）；sticker 的 `stickerHover` 预览切换不受影响。

---

## @easemob/uikit-core 1.5.1 (2026-08-28)


### 调整

- **EmojiPicker「常用」与「Emoji」合并为单一视图**：常用最近使用区置于视图顶部、完整 Emoji 列表在下，同一滚动区；移除已无用的 `recentIcon` prop（`emojiIcon` 改为表情视图 tab 图标），其余 props（`recent` / `recentCount` / `tabsPosition` / `stickerHover` / `emojiPreview`）语义不变。

---

## @easemob/uikit-core 1.5.0 (2026-08-28)


### 新增

- **EmojiPicker 组件重构**：
  - 「常用」改为动态最近使用：`useUIKitStorage` 按 `appKey + userId` 隔离持久化（无 `<UIKitProvider>` 时降级内存），默认保留最近 5 个（`recentCount` 可配）；
  - 独立「Emoji」完整列表 tab（新增 `EMOJI_ALL` 常量）；表情包注入 tab 默认不自动选中；
  - 新增 props：`recent` / `recentCount` / `tabsPosition`（默认 `bottom`）/ `stickerHover` / `recentIcon` / `emojiIcon` / `emojiPreview`；支持 sticker hover 预览图 ↔ gif 切换、内置 emoji 悬停放大预览、每个 tab 项预览小图（表情包缺省自动回落包内第一个 sticker 预览图）；
  - 新增公开类型 `EmojiTabsPosition`；新增 i18n `emoji.full` / `emoji.recentEmpty`（zh-CN / en）。

### 修复

- **重登后事件处理器未恢复注册**（D123）：`useCoreUIKitProvider` 抽取 `registerClientSetup()`（幂等重建 `onClientSetup` 场景挂钩 + user-info 监听），`setupClient` 与 `login()` 共用；登出后重新登录先恢复注册再连接，连接事件不再无人消费；`client` 新增 `isConnected` 访问器。

---

## @easemob/uikit-core 1.4.0 (2026-08-26)


### 破坏性变更

- **图标资源目录整合**：`assets/icons-filled/` 下 7 个面性 SVG 迁移到 `assets/icons-v2/filled/`，`icon-map.ts` 移除独立 filled 注册表，面性图标 name 仍保持 `filled/` 前缀；`assets/icons/` 旧库整目录删除，V2 成为唯一图标库。
- 修复 3 个 V2 资源拼写错误：`singal`→`signal`、`rect/personnclock`→`rect/person-clock`、`rectnarrowreturn`→`rect/narrow-return`。

### 修复

- `icons:check` 脚本覆盖 `assets/icons-v2/`（含 `filled/`）与 `assets/icons/`，旧库删除后自动仅校验 V2；支持无 `src/` 目录的包扫描。

---

## @easemob/uikit-core 1.3.0 (2026-08-25)


### 新增

- **黑名单选人 i18n 文案**：新增 `contact.blocklist.add` / `contact.blocklist.emptySelectable` / `contact.blocklist.addSuccess` / `contact.blocklist.addFailed`（zh-CN / en），供黑名单「添加」选人弹窗使用。

---

## @easemob/uikit-core 1.2.0 (2026-08-25)


### 新增

- **通讯录黑名单 i18n 文案**：新增 `contact.entryBlocklist` 与 `contact.blocklist.empty` / `contact.blocklist.remove` / `contact.blocklist.removeConfirmTitle` / `contact.blocklist.removeConfirm` / `contact.blocklist.removeSuccess` / `contact.blocklist.removeFailed`（zh-CN / en），供 uikit-im 黑名单列表使用。

---

## @easemob/uikit-core 1.1.0 (2026-08-19)


### 新增

- **Skeleton 骨架屏组件**：新增 `EmSkeleton` 组件，支持头像 + 文字行变体，动画 shimmer 跟随 `--uikit-anim-*` 并尊重 `prefers-reduced-motion`。
- **Modal danger 变体**：`EmModal` 新增 `type?: 'default' | 'danger'`。
- **Toast 能力补全**：`EmToast` / `useToast` 新增 `closable` / `position` / `actionText` / `#action` 插槽；`duration=0` 表示不自动关闭。
- **Input error / readonly 态**：`EmInput` 新增 `error` / `error-message` / `readonly` props。
- **Empty 空状态模板**：`EmEmpty` 扩展 `illustration` / `title` / `description` / `action` slot。

### 视觉与主题

- **全局焦点环**：`theme/index.css` 新增 `--uikit-focus-ring-color` 与全局 `:focus-visible` 样式。
- **间距阶梯**：新增 `--uikit-spacing-1~7` 与密度档映射。
- **Type Scale 排版规范**：新增 `--uikit-font-lineheight-*` / `--uikit-font-weight-*` / `--uikit-font-family`。
- **暗色对比度**：`text-tertiary` 暗色值提亮为 `#8a92a0`。
- **动画系统完善**：新增 `data-uikit-anim-level`（subtle/normal/expressive）与 `data-uikit-anim-enabled` 覆盖。

### 修复

- **图标 color 行为统一**：描边/填充图标均通过 `color` prop 改色，无需 `:style` 特例。
- **移动端触摸热区**：`EmIconButton` 在触屏设备下扩展最小触摸区域至 44×44px。

---

## @easemob/uikit-core 1.0.0 (2026-08-15)


### 新增

- **图标体系**：`EmIcon` 支持多注册表（`assets/icons` + `assets/icons-v2` + `assets/icons-filled`），`icon-map.ts` 新增 `getV2IconNames()` / `getFilledIconNames()`，为线性/面性图标库提供自动索引；`color` prop 对 `fill="currentColor"` 的填充式图标同样生效。
- **共享基座首版（P1 抽核自 `@easemob/uikit-im` 迁出）**：
  - SDK 基座层：`UIKitClient` / `ManagerHost`（**含 `ChatRoomManager` 注册**，为聊天室场景包预留）/ wire 类型 / user-info & presence domain / 连接级事件 / notice 工具
  - Pinia stores：`useClientStore` / `useThemeStore` / `useUserInfoStore` / `usePresenceStore`
  - 共享 composables：`useClient` / `useTheme` / `useUserInfo` / `useOwnUserInfo` / `usePresence` / `useToast` / `useNotification` / H5 通用（`useH5Adaptation` / `useKeyboard` / `useLongPress` / `usePullRefresh` / `useViewport` / `useBottomSheet` / `useRipple`）/ 通用交互（`useKeyBindings` / `useResizable` / `useUIKitStorage`）/ Provider 装配（`useCoreUIKitProvider` / `useCoreUIKit` / `useProviderSideEffects`）
  - 24 个原子组件（Em* 基础组件集，含 story）+ theme CSS 变量（539 行）+ locale（含 `mergeLocaleMessages`，供场景包合并 i18n keys）+ constants + 通用 utils（logger / log-store / sdk-error / download / z-index / format-time / linkify）
  - core 版 `EmUIKitProvider` 容器（props 子集 + 场景无关共享副作用）
  - resolver / auto-imports 参数化生成（`gen-aux-entries.mjs`）：`EasemobUIKitCoreResolver` / `EasemobUIKitCoreImports`
- 对外 API 零回归：`@easemob/uikit-im` 全量 re-export core 符号，原 416 个公共导出名全部保留。
