# Chat 抽屉三种接管能力（整块 / 部分 / 自绘壳）设计执行计划

> 状态：**已落地**（2026-08-20 规划，D119 已实施完毕：三种接管 + `EmChatDrawer` 导出 + `showDrawerEntry`）。
> 2026-09-08 追加：抽屉展示模式重构（push 挤压 / overlay 遮挡 + 移动端全屏），见「八、抽屉展示模式（push/overlay + 移动端全屏）」。
> 对应 TECH-DEBT [D119](#d119)。
> 关联 skill：`uikit-chat-plugin-tabs` / `uikit-component-authoring` / `uikit-docs-authoring` / `uikit-release-build`。
> 本计划属公开 API 变更（新增插槽 + 导出 + 类型），实施前先确认「六、关键决策点」，确认后再编码。

---

## 一、背景与结论

当前 `EmChatContainer` / `EmChat` 内的聊天信息抽屉（`ChatInfoDrawer`，`modules/chat/drawer/chat-info-drawer.vue`）是**硬编码渲染**，业务方无法接管或重写：

- **整块**：`chat.vue` 中 `<ChatInfoDrawer>` 无任何插槽包裹（1180 行），无法整体替换；
- **部分**：`ChatInfoDrawer` 内部各 section（资料卡 / 备注 / 群公告 / 成员列表 / 群管理 / 操作按钮等）写死，内部虽用了 `ChatDrawer` 壳的 `#header`/body/`#footer` 插槽，但都是组件自己填的，**没有 `<slot>` 透传给外部**；
- **自绘壳**：通用抽屉壳 `ChatDrawer`（`drawer/chat-drawer.vue`）本身开放 `#header`/默认 body/`#footer` 三个插槽，但 `modules/chat/index.ts` **只导出了 `EmChatInfoDrawer`，未导出 `EmChatDrawer`**。

目前唯一可做的「裁剪」是 `ChatConfig` 里的显隐开关（`groupManagement.showMuteAll / showMuteList / showBlocklist / showAllowlist / showSharedFiles / showJoinRequests`、`groupManagement.displayMode`、`groupMember.allowChat`），只能控制显隐，**改不了布局、改不了内容、加不了自定义区块**。

**结论**：通过新增插槽与导出（纯增量，不破坏现有 props/emits）补齐三种能力：

1. **整块接管**：`EmChatContainer` / `EmChat` 新增 `#drawer` 插槽；
2. **部分接管**：`ChatInfoDrawer` 各 section 新增具名插槽并逐层透传；
3. **自绘壳**：导出 `EmChatDrawer` 通用抽屉壳。

---

## 二、三种模式定义

| 模式 | 能力 | 落点 |
| --- | --- | --- |
| **整块接管** | 用户完全替换默认聊天信息抽屉，自己控制开合与内容 | `EmChatContainer` / `EmChat` 新增 `#drawer` 插槽 |
| **部分接管** | 用户重写抽屉内单个区块（如成员列表、群管理、footer），其余保持默认 | `ChatInfoDrawer` 内部各 section 新增具名插槽，逐层透传 |
| **自绘壳** | 用户拿到通用抽屉壳（overlay / 偏移 / header/body/footer 插槽），自己搭内容 | 导出 `EmChatDrawer` |

三种能力相互独立、可组合使用（例如「整块接管」后内部用「自绘壳」+「部分接管」的 section 组件）。

---

## 三、公开 API 设计

### 3.1 自绘壳：导出 `EmChatDrawer`

- `modules/chat/index.ts` 增加：

  ```ts
  export { default as EmChatDrawer } from './drawer/chat-drawer.vue'
  export type { ChatDrawerProps } from './drawer/chat-drawer.vue'
  ```

- `ChatDrawerProps` 目前定义在 `chat-drawer.vue` 的 `<script setup>` 内（`show` / `overlay` / `closeOnClickOverlay` / `width` / `offsetTop`）。建议**迁到 `modules/chat/types.ts`**，便于 gen:api 文档自动生成与对外类型引用；从 `.vue` 直接 re-export type 亦可（与现有 `ChatInfoDrawerProps` 定义在 `.vue` 内的惯例一致），二选一，待决策点 2 确认。

### 3.2 整块接管：`#drawer` 插槽

新增 scope 类型（放 `modules/chat/types.ts`）：

```ts
export interface ChatDrawerSlotScope {
  /** 当前会话 */
  conversation: Conversation | null | undefined
  /** 是否群聊 */
  isGroup: boolean
  /** 抽屉是否打开 */
  show: boolean
  /** 打开抽屉（供自定义入口调用） */
  open: () => void
  /** 关闭抽屉 */
  close: () => void
  /** 抽屉顶部偏移（header 实际高度，传给 EmChatDrawer 的 offset-top） */
  offsetTop: number
}
```

`chat.vue` 改动：

- 把 `showDrawer` 的开合抽成 `openDrawer()` / `closeDrawer()`；
- 用带默认内容的插槽包裹 `<ChatInfoDrawer>`：

  ```vue
  <slot
    name="drawer"
    :conversation="currentConversation"
    :is-group="isGroupChat"
    :show="showDrawer"
    :open="openDrawer"
    :close="closeDrawer"
    :offset-top="headerHeight"
  >
    <ChatInfoDrawer ... />  <!-- 默认内容不变 -->
  </slot>
  ```

`chat-container.vue` 改动：透传 `#drawer`。

### 3.3 部分接管：section 级插槽

统一 scope 类型（**只给数据 + `close`**，业务动作仍走已有 emits 或 `useGroup`/`useContact` composable，避免把内部方法变成 API 面）：

```ts
export interface ChatInfoDrawerSlotScope {
  conversation: Conversation | null | undefined
  isGroup: boolean
  groupId: string
  group?: UiGroup
  members: UiGroupMember[]
  memberCount: number
  currentUserId: string
  isOwner: boolean
  isAdmin: boolean
  canAddMember: boolean
  loadingGroup: boolean
  close: () => void
}
```

插槽清单（`ChatInfoDrawer` 内新增，默认内容 = 现有实现；`chat.vue` 与 `EmChatContainer` 逐层透传）：

| 插槽名 | 覆盖区块 | 显示条件 |
| --- | --- | --- |
| `drawer-header` | 标题栏（返回/关闭） | 恒显示 |
| `drawer-profile` | 单聊成员条（头像+添加）/群资料卡（群名群描述编辑/ID） | 恒显示 |
| `drawer-settings` | 消息搜索/免打扰/置顶设置行 | 恒显示 |
| `drawer-announcement` | 群公告 | 仅群聊 |
| `drawer-members` | 群成员九宫格 + 查看全部 | 仅群聊 |
| `drawer-admin-actions` | 转让群主/设置管理员 | 仅群聊 + 群主 |
| `drawer-management` | 群管理 section | 仅群聊 |
| `drawer-actions` | 清空聊天记录等通用操作 | 默认内容仅群聊（单聊清空/删除入口在 footer） |
| `drawer-footer` | 单聊：清空聊天记录/删除会话；群聊：退出/解散 | 恒显示（非成员列表页） |
| `drawer-member-detail` | 群成员列表二级页 | 二级页打开时 |

约定：

- 外层保留现有 `v-if` 显隐条件，`<slot>` 放条件内，用户重写也自动遵守语义；
- 插槽名统一 `drawer-*` 前缀，与既有 `#header` / `#message-*` / `#message-footer-*` 无冲突。

透传策略：

- `chat.vue` 对 `ChatInfoDrawer` 用 `useSlots()` 过滤 `drawer-` 前缀插槽 v-for 透传（避免把整块 `#drawer` 和 `message-*` 插槽误传进 `ChatInfoDrawer`）；
- `EmChatContainer` 同样透传 `#drawer` 与所有 `drawer-*` 插槽。

### 3.4 抽屉入口（附带说明）

- Header 已是整块插槽（`#header`，scope 带 `conversation`），用户替换 header 即可自定义抽屉入口，**本计划不强制新增入口开关**；
- 可选（另议）：`config.header` 增加 `showDrawerEntry?: boolean`，以及清理现有 dead 字段 `header.customSlot`（当前代码未读取），见决策点 3。

---

## 四、实施步骤（每阶段可独立验证）

- **阶段 0 — 类型与导出（自绘壳）**
  - `modules/chat/types.ts`：新增 `ChatDrawerSlotScope`、`ChatInfoDrawerSlotScope` 类型；迁 `ChatDrawerProps`（若走 3.1 的迁移方案）；
  - `modules/chat/index.ts`：导出 `EmChatDrawer` + 相关类型。

- **阶段 1 — 整块接管**
  - `chat.vue`：抽 `openDrawer`/`closeDrawer`；用 `#drawer` 插槽包裹 `ChatInfoDrawer`；绑定 scope；
  - `chat-container.vue`：透传 `#drawer`；
  - 验证：demo 用 `EmChatDrawer` 自绘，点 header 入口按钮可开合。

- **阶段 2 — 部分接管**
  - `chat-info-drawer.vue`：为各 section 包裹具名插槽（默认内容 = 现内容），绑定 scope；
  - `chat.vue` / `chat-container.vue`：透传 `drawer-*` 插槽；
  - 验证：demo 重写单个 section（如 `#drawer-members` 或 `#drawer-footer`），其余保持默认。

- **阶段 3 — 文档 / demo / story**
  - `apps/demo`：增加抽屉三种接管示例；
  - `apps/docs`：组件页补充插槽说明（触发 `uikit-docs-authoring`，gen:api 需双语注释）；
  - 补 story（`chat-container` 或 `chat-info-drawer` story）。

- **阶段 4 — 验证门禁**
  - 类型检查 + 构建（见「七、验证门禁」）。

---

## 五、影响面与兼容性

- **纯增量**：新增插槽/导出，不改现有 props/emits 语义，现有使用方零破坏；
- 新增 `ChatDrawerSlotScope` / `ChatInfoDrawerSlotScope` 两个公开类型，需登记文档（双语注释）；
- `drawer-member-detail` / 各 section 被接管后，**对应内置交互不再触发**（如接管 `drawer-members` 后，成员事件由用户自接），需在文档与注释中明确；
- 版本号按 minor 处理，遵守「CHANGELOG 为唯一版本源」，提交前跑 `pnpm changelog:check`。

---

## 六、关键决策点（已确认）

| 决策项 | 结论 | 说明 |
| --- | --- | --- |
| 1. 插槽命名 | 接受 `drawer-*` 前缀 | 避免与 `#header` / `#message-*` 冲突，语义清晰 |
| 2. `ChatDrawerProps` 位置 | 迁到 `modules/chat/types.ts` | 便于 gen:api 自动生成与对外类型引用，统一公开类型出口 |
| 3. 入口开关 | 增加 `config.header.showDrawerEntry?: boolean`（默认 true），并清理 dead 字段 `header.customSlot` | 业务方可关闭默认抽屉入口；`customSlot` 当前代码未读取，属历史残留 |
| 4. 部分接管粒度 | 保持 10 个 section 插槽（好友抽屉改版后 `drawer-remark` 移除、`drawer-actions` 默认内容仅群聊） | 覆盖资料卡 / 会话设置 / 公告 / 成员 / 群主操作 / 群管理 / 通用操作 / footer / 成员二级页，满足常见定制需求 |
| 5. 推进节奏 | 按四阶段推进 | 阶段 0→1→2→3→4，每阶段可独立验证 |

---

## 七、验证门禁

- 类型检查：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit`（0 错误）；
- 构建：`pnpm -F @easemob/uikit-im build`；
- demo 类型检查：`cd apps/demo && pnpm exec vue-tsc --noEmit`；
- 版本号同步：`packages/uikit-im/package.json` 与根 `CHANGELOG.md` 最新版本段一致，`pnpm changelog:check` 通过；
- 产物/依赖无混入：`git diff --cached --name-only | grep -E 'dist/|node_modules/|\.tgz$'` 为空。

---

## 附：涉及文件清单

| 文件 | 改动 |
| --- | --- |
| `packages/uikit-im/src/modules/chat/types.ts` | 新增两个 scope 类型 + 迁 `ChatDrawerProps` |
| `packages/uikit-im/src/modules/chat/index.ts` | 导出 `EmChatDrawer` + 类型 |
| `packages/uikit-im/src/modules/chat/chat.vue` | 抽开合 + `#drawer` 插槽 + 透传 `drawer-*` |
| `packages/uikit-im/src/modules/chat/drawer/chat-info-drawer.vue` | section 级具名插槽 |
| `packages/uikit-im/src/containers/chat-container/chat-container.vue` | 透传 `#drawer` / `drawer-*` |
| `apps/demo` | 三种接管示例 |
| `apps/docs` | 组件页插槽说明 + gen:api 类型 |
| `packages/uikit-im/src/**/*.story.vue` | 抽屉接管 story |

---

## 八、抽屉展示模式（push/overlay + 移动端全屏）（2026-09-08 落地）

在三种接管能力之上，补充**展示模式**维度（纯增量，默认行为不变）：

| 决策点 | 结论 | 理由 |
| --- | --- | --- |
| 1. 模式入口 | `ChatConfig.drawer.mode: 'overlay' \| 'push'`（**默认 push**，2026-09-08 调整）+ `drawer.width`（默认 320） | 与 `header`/`messageList` 等配置平级；push 为设计主推形态 |
| 2. push 实现 | `chat.vue` 主区包 `.chat__body`(flex row) > `.chat__main`(flex column) 两层静态包裹；push 时抽屉壳渲染为静态 flex 项，`width 0 → drawerW` 过渡挤压主区 | overlay 模式下包裹层无定位无 gap，absolute 包含块仍是 `.chat`，视觉逐像素不变 |
| 3. push 视觉 | 与主区平级的平面区域：背景与聊天容器统一 `--uikit-chat-bg`（header/body/section/actions 全拉平，无分层色块/描边/卡片阴影），圆角 `--uikit-components-radius`（与 ChatContainer 边角一致）；与主区间隔 `--uikit-container-gap` 透出宿主底色；内层固定宽度 wrapper 保证过渡期间内容不挤压换行 | 设计师稿「平级区域 + gap 透底色」，非描边卡片 |
| 4. push 语义 | 布局占位而非弹层：无遮罩、无 click-layer、`onClickOutside` 不关闭、`offsetTop` 忽略（抽屉全高） | 与 overlay 的「临时弹层」语义区分 |
| 5. 移动端 | `h5.isMobile`（viewport < 768）时两种模式一律回落**满铺全屏**：盖住 header、圆角归零、宽度 100%、右滑进入画，header 主档以返回箭头（chevron/left）替代右上角关闭 | 窄屏上 320px 抽屉没有并存空间，独立页面观感更符合移动端习惯 |
| 6. 壳 API | `ChatDrawerProps` 新增 `mode` / `fullscreen`（optional）；`#drawer` slot scope 新增 `mode` / `fullscreen` | additive，自绘壳接管方同样受益 |
| 7. 二级抽屉 | 群管理五页（禁言/黑名单/白名单/共享文件/入群申请）相对一级 panel absolute 定位，两种模式 + 全屏下均无需改动 | 现状结构天然兼容 |
