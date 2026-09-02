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
