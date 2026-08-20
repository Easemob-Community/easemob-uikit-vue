# uikit-im 组件插槽与 Props 可控性反向评估（UIIM-CAPABILITY-REVIEW）

> 评估日期：2026-08-20。评估对象：`@easemob/uikit-im` 2.1.0（`packages/uikit-im/src`）。
> 方法：消费者视角反向推演——「接入方想做什么 → 当前 API 能否做到 → 卡在哪」，
> 覆盖容器层 / 会话模块 / 聊天模块 / 群组模块四层。
> 状态：**评估完成，待按优先级排期实施**。关联 TECH-DEBT：D120。
> 背景：Chat 抽屉「不支持自定义」被客户点名（已由 D119 补齐三种接管能力），
> 本次为同口径的全面反向排查，避免同类缺口再靠客户提醒才发现。

---

## 结论先行

uikit-im 的插槽哲学在「主体 + 列表 + 头部 + 消息渲染」层执行得较彻底，但**凡是组件内部
硬编码渲染的「子界面」（弹窗 / 菜单 / 二级页 / 列表项），普遍没有对应接管点**。判断标准：
template 里出现 `<XxxModal v-model:show=... />`、`<Popup>`、`<ActionSheet>`、`<ChatDrawer>`
或 `v-for` 渲染子项，但周围没有 `<slot name=...>` 包裹，即为缺口。

硬缺口按客户高频程度分三档：

1. **会话列表 `conversation-list`**：Header `+` 菜单与「新建会话/添加联系人/创建群组」三个
   弹窗硬编码，无法自定义入口、无法接管弹窗（客户接自己的选人器/好友体系即卡住）；且
   **会话项无 `#item` 插槽**（contact/group 列表都有，唯独 conversation 没有，不一致）。
2. **聊天页 `chat`**：名片弹窗（`UserCardModal`/`GroupCardModal`）点头像直接开内置、无对外
   emit；邀请成员 / 转发 / 搜索 / 多选栏均硬编码无接管。
3. **消息操作菜单 `message-interactive`**：菜单本体只能靠 config 裁剪 + `#message-action-extra`
   底部追加，**无法整体接管或插入自定义主菜单项**（举报/收藏/置顶自定义等）。

次要缺口：群管理五个二级页、群成员右键菜单、删除确认弹窗、群公告/置顶横幅。

---

## 一、能力面基线（已支持，对照参考）

### 容器层插槽（已核实）

| 容器 | 已支持插槽 |
|---|---|
| `conversation-container` | `#tabs` / `#header` / `#empty` / `#status-banner` / `#body` / `#footer` |
| `contact-container` | `#header` / `#header-extra` / `#nav` / `#nav-entry` / `#nav-entry-extra` / `#home-body` / `#home-footer` / `#back-icon` / `#subheader-extra` / `#body` / `#footer` / `#loading` / `#loading-more` / `#no-more` / `#empty` / `#group-header` / `#item` / `#contact-search` / `#group-*` 系列 / `#notice` |
| `contact-list-container` | `#header` / `#body` / `#footer` / `#loading` / `#loading-more` / `#no-more` / `#empty` / `#group-header` / `#item` / `#search` |
| `group-list-container` | 同 `contact-list-container`（`#item` 等） |
| `address-book-container` | `#header` / `#header-extra` / `#nav` / `#nav-entry` / `#nav-entry-extra` / `#home-body` / `#home-footer` / `#back-icon` / `#subheader-extra` / `#notice` / 默认插槽 |
| `chat-container` | `#empty` / `#loading` / `#error` / `#header` / `#header-avatar` / `#header-title` / `#header-extra` / `#drawer`（D119）/ `drawer-*`（D119）/ `#message-*` 透传 |

### 模块层已支持能力

- **会话分栏**：`#tabs` 完全接管（`ConversationTabsSlotScope`）。
- **联系人/群组列表项**：`#item` / `#group-item`（`contact-container` 等）。
- **聊天头部**：`#header` / `#header-avatar` / `#header-title` / `#header-extra`。
- **输入框**：`#toolbar-extra` / `#input-panel`（`useChatPlugin` 上下文）。
- **消息渲染**：`#message-{type}` / `#message-footer-{type}` / `#message-custom` / `#message-action-extra`。
- **抽屉**：`#drawer` 整块 + `drawer-header/profile/remark/announcement/members/admin-actions/management/actions/footer/member-detail` 十处 section 插槽（D119，2026-08-20 落地）。

---

## 二、缺口清单（分层详述）

### 2.1 会话列表 `conversation-list.vue`

| # | 缺口 | 现状 | 影响 |
|---|---|---|---|
| CL-1 | Header `+` 菜单硬编码 | `headerMenuItems` 固定 `newChat`/`addContact`/`createGroup` 三项，PC `Popup` + H5 `ActionSheet` 都写死 | 无法增删改入口、无法隐藏菜单（`showHeader: false` 会连标题一起隐藏） |
| CL-2 | 三个弹窗硬编码渲染 | `<NewChatModal>` / `<AddContactModal>` / `<CreateGroupModal>` 直接渲染，无插槽 | 客户接自己的选人器 / 好友体系 / 企业通讯录时无法接管 |
| CL-3 | 删除会话确认 Modal 硬编码 | 二次确认弹窗固定文案 + 「同时删除聊天记录」勾选 | 无法自定义删除行为/文案（优先级低） |
| CL-4 | **会话项无 `#item` 插槽** | `<ConversationItem>` 直接 `v-for` 渲染；组件内仅 `#item-prefix`/`#item-suffix` 两个小插槽且**未从列表层透传** | 无法给会话项加角标/改布局/换头像名称渲染；与 contact/group 的 `#item` 惯例不一致 |

### 2.2 聊天页 `chat.vue`

| # | 缺口 | 现状 | 影响 |
|---|---|---|---|
| CH-1 | 名片弹窗无接管 | `onHeaderAvatarClick` / `onAvatarViewProfile` 直接开内置 `UserCardModal`/`GroupCardModal`，无对外 emit | 客户想弹自己的资料卡/名片无法拦截 |
| CH-2 | 邀请成员弹窗硬编码 | `<InviteMemberModal>` 直接渲染 | 无法接管入群邀请流程 |
| CH-3 | 转发弹窗硬编码 | `<ForwardModal>` 直接渲染 | 无法接管转发（自定义目标选择/合并转发 UI） |
| CH-4 | 搜索弹窗无接管 | `<MessageSearchModal>` 仅有 `config.messageList.search.enabled` 开关 | 无法替换搜索 UI（只能开关） |
| CH-5 | 多选栏硬编码 | `<MultiSelectBar>` 直接渲染 | 无法自定义多选操作栏 |
| CH-6 | 移除成员确认 Modal | 二次确认弹窗 | 优先级低 |

### 2.3 消息操作菜单 `message-interactive.vue` / `message-action-menu.vue`

| # | 缺口 | 现状 | 影响 |
|---|---|---|---|
| MS-1 | 菜单本体无法整体接管 | 菜单项集合由 `config.messageAction.enableXxx` 裁剪；`#message-action-extra` 只能**底部追加** | 无法整体替换菜单、无法在主菜单插入自定义项（举报/收藏/业务菜单）、无法改分组/顺序 |

### 2.4 群组模块

| # | 缺口 | 现状 | 影响 |
|---|---|---|---|
| GM-1 | 群管理五个二级页硬编码 | `group-management-section.vue` 内禁言/黑名单/白名单/共享文件/入群申请（`ChatDrawer` + `Popup`）直接渲染 | 现有 `drawer-management` 插槽只能「整体替换群管理」，无法单独接管某个二级页 |
| GM-2 | 成员右键菜单硬编码 | `group-member-list-item.vue` 内 `Popup`（禁言/拉黑/设管理员/移除/转让群主）直接渲染 | 无法自定义成员操作菜单项 |

### 2.5 低优先级（有 workaround 或影响小）

- `message-list.vue` 删除确认 Modal、群已读回执弹窗（后者有独立组件 `EmGroupReadReceiptModal`，但 list 内渲染点无接管）；
- `contact-detail.vue` 删除好友确认 Modal；
- 群公告横幅（`GroupAnnouncementBanner`）/ 置顶横幅（`PinnedBar`）：有 `visible` 开关，无插槽。

---

## 三、缺口矩阵与建议决策

> 补齐模式统一复用 D119 已验证的「**slot 默认内容 + scope**」范式：`<slot name=... :scope>` 包裹
> 默认子界面，业务传插槽即接管，不传则零变化，纯增量、向后兼容。scope 只给数据 + 必要的
> open/close 动作，内部动作仍走 emits / composable。

| # | 缺口 | 建议 | 方案草案 |
|---|---|---|---|
| CL-1 | Header 菜单不可定制 | **做（高）** | `headerMenuItems` 支持 props 注入（如 `menuItems?: {key,label,icon,handler}[]`）+ `#header-menu` 插槽整块接管；空数组隐藏菜单 |
| CL-2 | 三个弹窗不可接管 | **做（高）** | `#new-chat` / `#add-contact` / `#create-group` 三个插槽（scope：`show/open/close`），默认内容 = 内置弹窗 |
| CL-4 | 会话项无 `#item` | **做（高）** | 对齐 contact/group 惯例，新增 `#item` 插槽（scope：`conversation` + 选中/高亮态 + 内置动作），并在 `conversation-container` 透传 |
| CH-1 | 名片弹窗无接管 | **做（高）** | 头像点击改为先 emit `avatar-click`（`{type:'single'|'group', id}`）由业务决定；业务不处理时回落内置弹窗（或提供 `#user-card`/`#group-card` 插槽接管渲染） |
| MS-1 | 消息操作菜单不可整体接管 | **做（高）** | `#message-action-menu` 插槽整块接管（scope：`message` + 全部内置动作句柄 + `close`）；或 `messageAction.customItems` 注入主菜单项 |
| CH-2/3/4/5 | 邀请/转发/搜索/多选栏 | **做（中）** | 同 CL-2 模式：`#invite-member` / `#forward` / `#message-search` / `#multi-select-bar` 插槽，默认内容 = 内置 |
| GM-1 | 群管理二级页不可单独接管 | **做（中）** | `group-management-section` 内五个二级页各加 `#mute-list`/`#block-list`/`#allow-list`/`#shared-files`/`#join-requests` 插槽 |
| GM-2 | 成员右键菜单不可定制 | **做（中）** | `group-member-list` 的成员操作菜单支持 `menuItems` 注入 + `#member-menu` 整块接管 |
| CL-3 / CH-6 | 删除/移除二次确认 | **待定** | 低优先，可后置或并入对应弹窗接管 |
| 2.5 小项 | 横幅/删除确认 | **待定/不做** | 有 `visible` 开关，收益低，暂不做插槽 |

### 语义约定（定死，防歧义）

- 所有新增插槽**默认内容 = 现有实现**，不传插槽则行为与当前完全一致（零破坏）。
- scope 只给**数据 + open/close 动作句柄**；业务动作（发消息/加好友/建群/转发等）走既有
  emits 或 `useGroup`/`useContact`/`useChatPlugin` composable，不把内部方法全量暴露成 API。
- 「接管插槽」与「开关 prop」组合：插槽提供即接管（优先级最高）；开关仅控制内置子界面显隐。
- 新增插槽必须逐层透传：模块组件 → `chat.vue`/`conversation-list.vue` → 对应容器，并同步
  docs 插槽清单与 story。

---

## 四、验收口径

- 每个新插槽：不传 = 与当前行为一致；传 = 完全接管对应子界面；
- 门禁全绿：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build`
  + `cd apps/demo && pnpm exec vue-tsc --noEmit` + `pnpm changelog:check`；
- docs 插槽清单与实现一致；story 补接管示例；demo 补高频场景（自定义会话项 / 自定义名片弹窗 /
  自定义消息操作菜单）；
- 现有 API 零破坏（新增项全部可选）。

---

## 五、明确不做（防膨胀）

- `conversation-item` 内部细粒度插槽（头像/名称/时间分别开槽）——`#item` 整条替换已覆盖；
- 聊天 header 细粒度按钮开关（搜索/抽屉/更多逐项开关）——`#header` 整条覆盖已足够；
- 消息气泡内部细粒度插槽——`#message-{type}` 类型级替换已覆盖；
- 列表骨架屏/下拉刷新/滚动置顶的内部结构插槽——`#body`/`#footer` + 开关已覆盖；
- 二次确认弹窗（删除会话/删除消息/移除成员）逐一插槽化——收益低，纳入「对应主弹窗接管」统一处理。

---

## 六、附：缺口优先级排序（建议实施顺序）

1. **CL-2 会话列表三弹窗接管**（客户接选人器/好友体系的最硬卡点）
2. **CH-1 名片弹窗接管**（客户接自己资料卡）
3. **MS-1 消息操作菜单整体接管**（举报/收藏/业务菜单）
4. **CL-4 会话项 `#item` 插槽**（对齐 contact/group 惯例）
5. **CL-1 Header 菜单定制**（入口增删改/隐藏）
6. CH-2/3/4/5（邀请/转发/搜索/多选栏）+ GM-1/GM-2（群管理二级页 + 成员菜单）
7. 低优先小项（CL-3/CH-6/横幅）
