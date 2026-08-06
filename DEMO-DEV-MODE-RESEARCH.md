# Demo 开发者友好模式（Dev Hints）方案预研

> 调研日期：2026-08-05。文中行号为当日代码快照，可能随改动漂移，以文件+特征定位为准。
> 状态：**已实施（2026-08-06，第一版）**。落地位置 `apps/demo/src/dev-hints/`（types.ts / registry.ts / use-dev-hints.ts / demo-dev-hint-card.vue），开关在设置抽屉「开发者」分类（默认开）。详见 TECH-DEBT.md D87。

## 背景与目标

让 demo 成为「所见即所得」的教学工具，省去开发者查文档的搜索成本：

- 登录后默认开启「开发者友好模式」；
- 鼠标悬停会话项 → 浮出提示卡：该功能用到的环信（easemob-websdk）接口 + 官方文档链接 + UIKit 内实现思路；
- 悬停消息气泡几秒 → 出现一个"点子"（💡）角标，点击展开详情：该气泡的实现思路、各子功能用到的环信接口；
- 非侵入：只是 demo 层的一层覆盖物（overlay），不影响 uikit 组件本身。

## 可行性结论

**可行性高，成本低。** 三个关键前提都已具备：

1. **DOM 可识别**：UIKit 组件根 class 统一 kebab-case 且稳定（`.message-bubble-wrapper`、`.text-message`、`.chat`、`.conversation-list` 等），事件委托 + `closest()` 即可识别悬停目标；消息气泡还带 `data-msg-id`（`message-bubble-wrapper.vue:354-356`，现有生产用途是滚动定位），可反查消息对象做更精准的展示。
2. **API 映射素材现成**：所有环信接口调用集中在 `packages/uikit/src/sdk/domain/*.ts`，按域分文件（message/conversation/contact/group/presence/userInfo），逐方法对得上功能点（见下文映射表骨架）。
3. **开关机制现成**：demo 设置抽屉 `demo-settings-drawer.vue` 已有 7 个分类面板，状态统一由单例 `useDemoSettings()`（`apps/demo/src/composables/use-demo-settings.ts:144-331`）持有。新增「开发者模式」= 加一个 ref + 一个开关行，模式与现有 `chatInputMode` 完全一致。

## 已识别的悬停目标 → class 对照

| 功能区域 | 选择器 | 备注 |
|---|---|---|
| 消息气泡（总） | `.message-bubble-wrapper[data-msg-id]` | 可反查消息对象 |
| 各类型气泡 | `.text-message` / `.image-message` / `.file-message` / `.voice-message` / `.video-message` / `.custom-message` / `.combine-message` | 嵌在 wrapper 内，`closest` 拿类型 |
| 会话项 | `.uikit-cell:has(.conversation-item__info)` | **唯一薄弱点**：会话项根是 `Cell`，无专用根 class；`:has()` 兜底可用，或顺手给 `ConversationItem` 补根 class（对 uikit 的唯一可选小改） |
| 聊天容器 | `.chat-container` / `.chat` | |
| 会话列表 | `.conversation-container` / `.conversation-list` | |
| 输入框 | `.message-input` | |
| 通讯录 | `.contact-list-container` / `.contact-item` | |
| 群组 | `.group-list-container` / `.group-item` / `.group-detail` | |
| 根 | `.uikit-provider` | 事件委托挂载点可用 demo 的 `.demo-layout` |

## 功能 ↔ 环信接口映射表（骨架，实施时补全）

素材来源：`sdk/domain/*.ts`。示例：

| 功能 | UIKit 位置 | 环信接口 |
|---|---|---|
| 会话列表（本地） | `conversation-domain.ts:86` | `chatManager.getConversationList()` |
| 会话列表（服务端同步） | `conversation-domain.ts:96` | `chatManager.refreshSessionList()` + `onConversationListUpdate` |
| 进入/离开会话 | `conversation-domain.ts:72-83` | `setCurrentConversation` / `resetCurrentConversation` |
| 会话置顶/免打扰/标记 | `conversation-domain.ts:124/143/197` | `setConversationPinned` / `pushManager.setConversationSilentMode` / `addConversationMark` |
| 历史消息 | `message-domain.ts:296` | `chatManager.getHistoryMessages` |
| 发送（文本/图/文件/语音/视频/位置/自定义/合并） | `message-domain.ts:73-242` | `createXxxMessage` + 统一 `chatManager.sendMessage`（带上传进度） |
| 撤回 | `message-domain.ts:381` | `recallMessage` |
| 已读回执 | `message-domain.ts:394` | `sendMessageReadReceipts`；群已读人数 `getGroupMessageReadReceipts`(:363)、详情 `getGroupMessageReadUsers`(:515) |
| 置顶消息 | `message-domain.ts:442-460` | `pinMessage` / `unpinMessage` / `getPinnedMessageList` |
| 翻译 / 语音转文字 | `message-domain.ts:471/487` | `translateMessage` / `voiceMessageToText` |
| 合并转发/查看 | `message-domain.ts:218/510` | `createCombineMessage` / `downloadAndParseCombineMessage` |
| 在线状态 | `presence-domain.ts:51-80` | `subscribePresence` / `getPresenceStatus` / `publishPresence` |
| 好友/黑名单 | `contact-domain.ts:37-83` | `addContact` / `setContactRemark` / `addUsersToBlocklist` 等 |
| 群组管理 | `group-domain.ts:64-302` | 建群/成员/转让/禁言/黑白名单等一整套 |
| 群公告/共享文件 | `group-domain.ts:139-147/311-345` | `getGroupAnnouncement` / `getSharedFileList` 等 |
| 用户属性 | `user-info-domain.ts:35/106` | `getUserInfoByAttribute` / `subscribeUsersInfo` |

## 建议方案设计

### 架构：demo 层三件套（全部在 apps/demo 内，uikit 零侵入）

1. **元数据注册表 `dev-hints/registry.ts`**：一张声明式配置表，每项 = `{ match: (el: Element) => boolean 或 CSS 选择器, title, apis: [{ name, docUrl }], implNotes: string[]（实现思路，可引用 uikit 文件路径）, detail?: 更深度的展开内容 }`。消息气泡类条目可按消息类型（text/image/...）注册多条；支持用 `data-msg-id` 反查消息对象动态生成内容（如"这是一条图片消息，发送链路是 createImageMessage → sendMessage 带上传进度"）。
2. **悬停引擎 `dev-hints/use-dev-hints.ts`**：在 `.demo-layout` 根上做 `mouseover` 事件委托 → `closest()` 匹配注册表 → 防抖/延时（气泡类延时几秒才出"点子"角标，区域类即时出提示卡）→ 管理提示卡定位（fixed + getBoundingClientRect）与消失。配合 `useDemoSettings` 的开关整体启停。
3. **展示组件**：
   - `demo-dev-hint-card.vue`：轻量浮卡（自写，UIKit 无 Tooltip/Popover 组件——注意 `icon-button` 的 "tooltip" 只是原生 `title`）；
   - 详情展开用 **`EmPopup` 右侧抽屉**（与现有设置抽屉视觉一致），展示完整实现思路 + API 对照 + 文档链接；
   - "点子"角标用 `EmIcon`。

### 交互分层

- **L0 悬停即显**（会话项、输入框、通讯录等区域）：提示卡 = 功能名 + 核心接口 1-2 个 + "点击查看详情"；
- **L1 悬停延时**（消息气泡）：几秒后出现 💡 角标，不打扰正常浏览；
- **L2 点击展开**：抽屉 = 实现思路（UIKit 哪层做了什么）+ 全部相关接口 + 官方文档链接 +（可选）跳转 apps/docs 对应组件页。

### 文档链接

- 仓库内**目前没有任何环信官方文档站链接**（grep 无 `docs.easemob.com`），需新录一张 `功能 → 官方文档 URL` 配置表（websdk2 新站具体路径实施时联网确认）。
- `apps/docs`（vitepress，24 个组件页）的"功能描述"段落可作为"实现思路"文案起点；websdk API 命名权威来源是 `sdk/domain/*.ts` 和根目录 `easemob-websdk-next-*.tgz` 的 d.ts。

### 默认开启

登录后默认开（`useDemoSettings` 里默认值 true + localStorage 记忆用户关闭选择），设置抽屉可加「开发者」分类面板放开关与说明。

## 实施步骤建议

1. 建注册表骨架 + 引擎 + 提示卡，先做 2 个区域（会话项、文本气泡）跑通交互；
2. 补全注册表（按上文映射表逐域录入），整理官方文档 URL 表；
3. 详情抽屉（EmPopup）+ 实现思路文案（从 apps/docs 组件页和 domain 代码提炼）；
4. 默认开启 + 设置面板开关 + localStorage 记忆；
5. （可选）给 `ConversationItem` 补根 class，去掉 `:has()` 兜底。

## 风险与注意

- **维护成本**：注册表的 `implNotes`/接口名会随 uikit 迭代漂移——注册表条目里引用文件路径而非行号，评审时随代码改动同步更新；
- **H5/移动端无 hover**：该模式仅桌面端生效，移动端隐藏即可（demo 已有 PC/H5 分流）；
- **性能**：事件委托 + 防抖，注册表匹配保持 O(1) 的 `closest` 调用，无重渲染风险（覆盖层独立于 uikit 组件树）；
- 不要为了让提示更"智能"而去改 uikit 组件加 data 属性——`data-msg-id` 已有，其余靠 class 足够。
