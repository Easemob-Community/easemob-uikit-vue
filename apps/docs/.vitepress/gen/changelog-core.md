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
