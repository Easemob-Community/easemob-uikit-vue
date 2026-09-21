# Changelog

## @easemob/uikit-im 3.7.9 (2026-09-21)

### 新增

- **`EmChatContainer` 新增 `#notice` 聊天区通知条插槽**：位于聊天 header 与消息列表之间（置顶横幅、群公告横幅之上），作用域为 `{ conversation }`，供业务注入自定义通知内容（如防诈骗提示条）。

### 修复

- **会话列表行尾未读徽标对齐**：`EmBadge` 行尾（`unreadPlacement="inline"`）用法此前按头像角标绝对定位渲染，徽标右边缘比时间右边缘右移约半个徽标宽；现 `EmBadge` 新增 `inline` 模式按文档流渲染，徽标右边缘与时间右边缘对齐、垂直居中于消息摘要行（对齐 Figma 设计稿 `unraedarea right 0 / top 1 / h 16`）。

## @easemob/uikit-im 3.7.8 (2026-09-21)

### 变更

- **`enableReadReceipt` 关闭时隐藏全部「已读未读」状态指示**：此前仅隐藏单聊已读 icon 与群已读数，己方消息的 SENT / DELIVERED / READ 状态图标（空心圆 / 已读对勾等已读未读状态的 UI 载体）仍会残留展示；现开关关闭时这三类状态图标整体不渲染，气泡旁不再出现任何状态指示。发送中 spinner 与失败重试属本地操作反馈，不受影响。

## @easemob/uikit-im 3.7.7 (2026-09-21)

### 新增

- **全局已读回执开关 `enableReadReceipt`（Provider prop，默认 true）**：关闭后接收方不再发送消息级已读回执，且 UIKit 不展示已读状态——单聊己方消息隐藏「已读」icon、群聊不显示已读数 / 已读详情入口；不影响本机未读数同步（`clearConversationUnreadMessageCount` 保留）。群聊发送方的回执请求仍由 `ChatConfig.groupReadReceipt` 独立控制（sdk-contract 1.3.1 / core 2.8.6 / websdk5 1.3.3）。

## @easemob/uikit-sdk-websdk5 1.3.3 (2026-09-21)

### 新增

- **`enableReadReceipt` 能力开关落地**：`onMessage` 实时回执（`queueMessageReadReceipt`）与进入会话补发（`sendPendingReadReceipts` 钩子）在开关关闭时整体跳过，不再调用 `sendMessageReadReceipts`。

## @easemob/uikit-core 2.8.6 (2026-09-21)

### 新增

- **`EmBadge` 新增 `inline` prop**：徽标不占位覆盖、按文档流渲染（如会话列表行尾未读数），默认 `false` 行为不变；开启后 `placement` 不生效。
- **defaultFeatures 新增 `enableReadReceipt: true`**：全局已读回执开关默认值，经 features 响应式链路下发 adapter 与 UIKit（sdk-contract 1.3.1）。

## @easemob/uikit-sdk-contract 1.3.1 (2026-09-21)

### 新增

- **`UIKitFeatures` 新增 `enableReadReceipt?: boolean`**：是否启用消息已读回执，默认 true；类型面供 core / adapter / uikit-im 共享。

## @easemob/uikit-im 3.7.6 (2026-09-20)

### 变更

- **好友列表在线状态默认关闭**：`EmContactList`（含通讯录容器好友子视图与 `EmContactListContainer`）即使 Provider 全局开启 `enablePresence`，默认也不再展示联系人在线状态点，也不再为列表发起 presence 订阅；需要展示时显式传 `:enable-presence="true"`。
- **消息气泡头像在线状态点默认关闭**：`config.messageList` 新增 `presence` 开关（默认 `false`，微信/QQ 式消息流不带状态点）；开启后仅对方头像展示状态点，且需全局 `enablePresence` 链路可用。原先「store 有数据即被动显示」的默认行为移除，恢复方式：`:chat-config="{ messageList: { presence: true } }"`。

### 新增

- **`EmContactDetail` / `EmUserCardModal` / `EmGroupMemberList` 新增 `enablePresence` prop**：名片、联系人详情、群成员列表（主动查看场景）默认仍跟随 Provider 全局 `enablePresence` 展示在线状态，现可组件级覆盖（传 `false` 单独关闭）。

## @easemob/uikit-sdk-websdk5 1.3.2 (2026-09-20)

### 新增

- **联系人关系变更全局通知**：通知引擎新增 `notifyContactEvent`，`onContactRefuse`（我发出的好友申请被对方拒绝）与 `onContactDeleted`（被好友删除）除既有 store 写入 / 会话内通知外，同时投递全局通知（页内右上角弹窗 / 页面隐藏时浏览器系统通知优先、失败降级页内）。好友关系变更属低频高优事件，跳过免打扰 / 当前会话 / triggerMode 判定，仅尊重通知总开关；送达回调通道语义与消息通知一致。

## @easemob/uikit-sdk-webim4 1.3.2 (2026-09-20)

### 新增

- **联系人关系变更全局通知**：与 websdk5 1.3.2 对齐，`onContactRefuse` / `onContactDeleted` 同步投递全局通知。

## @easemob/uikit-im 3.7.5 (2026-09-18)

### 修复

- **修复删除消息后刷新页面消息「复活」的问题（严重）**：消息删除原先只移除前端内存列表、未调用 SDK，刷新后历史消息从服务端漫游重新拉取导致被删消息重新出现。现删除 / 批量删除会先调用 SDK 删除当前用户的服务端漫游历史（本账号各端经多端事件同步移除），成功后才移除本地消息，删除失败保留消息并 toast 提示；仅本地未送达消息（无服务端 ID）只本地移除（sdk-contract 1.3.0 / websdk5 1.3.1 / webim4 1.3.1）。
- **修复重发失败消息时窄窗口丢消息**：原实现「先删旧消息再发送」，发送前校验同步抛错会导致该条消息从列表静默消失；改为发送失败时回补旧失败消息。
- **图片消息防闪烁**：己方发送成功 body 回填远程地址时先预载新图再切换 src，避免气泡白屏重载「闪一下」；发送中气泡用已加载图片自然尺寸撑住容器，避免回填真实尺寸时跳动；消息列表 :key 稳定性修复（本地 ID 优先），发送成功替换气泡不再整树销毁重建（含已加载图片）。

### 变更

- **好友申请通知列表改版**（对齐 Figma「新-Demo」）：新增「对方拒绝了你的好友申请」通知（粉色失望图标头像），列表去除头部 / 时间 / 附言独立行，副文案按场景展示附言 / 群名 / 设计稿固定文案；接受 / 拒绝操作补成功 toast（sdk-contract 1.3.0）。
- **输入占位文字统一 13px**（core 2.8.5）；会话列表 header / 搜索槽 / 状态横幅 / 分栏 tab 左缘统一 16px 对齐（列表项头像左缘同口径）；群成员移除菜单文案收敛为「移除」。

### 新增

- **`EmAddressBookContainer` / `EmContactContainer` 新增 `showNoticeAddButton`**：「新请求」子视图头部展示添加好友按钮，默认 `false`。

## @easemob/uikit-core 2.8.5 (2026-09-18)

### 变更

- **输入占位文字字号统一为 13px**（`EmInput` 及聊天输入框），比正文（15px）小一档，对齐抽屉搜索框观感。
- **群成员移除文案收敛**：`group.memberList.remove` 由「从群组移除」改为「移除」。

### 新增

- **icons-v2 新增 `dspntd`（失望）图标**：好友申请被对端拒绝的通知条目使用。
- **locale 新增 `contact.inviteRequestReceived` / `contact.inviteDeclinedByPeer`**：好友申请副文案与「拒绝了你的好友申请」通知文案。

## @easemob/uikit-sdk-contract 1.3.0 (2026-09-18)

### 新增

- **`SdkMessageDomain` 新增 `removeMessages`**：删除当前用户的服务端漫游历史（本账号各端同步生效），补齐消息删除的契约面（双 adapter 实现见 websdk5 1.3.1 / webim4 1.3.1）。
- **`UiContactInvite` 新增 `outgoing` 字段**：标记「我发出的申请被对方拒绝」的通知方向，用于通知列表展示。

## @easemob/uikit-sdk-websdk5 1.3.1 (2026-09-18)

### 新增

- **实现契约 `removeMessages`**：透传 SDK `chatManager.removeHistoryMessages` 删除服务端漫游历史，成功后触发 `persistence.message.deleteMessages` 删除墓碑（多端移除事件路径另有落库）。

### 修复

- **`onContactRefuse` 补「我发出的申请被对方拒绝」通知**：无本地 pending 申请时落一条 `outgoing: true` 的拒绝通知，UI 展示「拒绝了你的好友申请」。

## @easemob/uikit-sdk-webim4 1.3.1 (2026-09-18)

### 新增

- **实现契约 `removeMessages`**：4.x SDK 无单条删除服务端漫游历史的公开 API，降级为本地删除语义（仅落删除墓碑），UI 本地移除行为与旧版一致。

### 修复

- **`onContactRefuse` 补「我发出的申请被对方拒绝」通知**：与 websdk5 1.3.1 对齐。

## @easemob/uikit-im 3.7.4 (2026-09-18)

### 变更

- **侧栏列表容器宽度默认随宿主容器弹性伸缩**：会话 / 联系人 / 群组 / 通讯录 / 黑名单列表容器与聊天区等兄弟组件并排时，宽度由固定 `360px` 改为按 `--uikit-sidebar-width` 基准弹性取值（`clamp(240px, 25%, 480px)`，宿主容器约 1440px 处为 360px），窗口变宽 / 变窄时列表随之伸缩；宿主覆写该 token 为 `100%` 或固定 px 的行为不变（core 2.8.4）。

### 新增

- **`EmResizable` 新增 `fluid` 弹性模式**：开启后未拖拽过且无受控值时不写内联尺寸，宽度交由 CSS（如侧栏基准 token）决定；首次拖拽以当前实际渲染尺寸为起点，拖拽后内联 px 接管，适合「默认弹性 + 可拖拽定宽」的侧栏（core 2.8.4）。

## @easemob/uikit-core 2.8.4 (2026-09-18)

### 变更

- **`--uikit-sidebar-width` 默认值由固定 `360px` 改为弹性 `clamp(240px, 25%, 480px)`**：新增边界 token `--uikit-sidebar-min-width`（默认 240px）/ `--uikit-sidebar-max-width`（默认 480px），侧栏列表容器随宿主容器宽度伸缩；宿主覆写为 `100%` 或固定 px 的用法不受影响。

### 新增

- **`EmResizable` 新增 `fluid` prop**：fluid 且未拖拽过、无受控值时不写内联尺寸（由 CSS 决定），首次拖拽时测量根元素当前实际尺寸作为拖拽起点，拖拽后经 `update:model-value` / 内联 px 接管。

## @easemob/uikit-im 3.7.3 (2026-09-17)

### 新增

- **新增聊天页消息昵称展示特性开关 `showNicknameInSingleChat` / `showNicknameInGroupChat`**：单聊消息列表默认不展示对方昵称（微信风格），`<UIKitProvider :show-nickname-in-single-chat="true">` 可打开；群聊默认展示发送者昵称，`:show-nickname-in-group-chat="false"` 可关闭。消息气泡外壳按消息自身的 `conversationType` 判定（合并转发弹窗、搜索结果等独立场景同样生效），运行时切换即刻生效。

## @easemob/uikit-core 2.8.3 (2026-09-17)

### 新增

- **defaultFeatures 补齐昵称展示开关默认值**：`showNicknameInSingleChat` 默认 false、`showNicknameInGroupChat` 默认 true（契约字段定义见 uikit-sdk-contract 1.2.1）。

## @easemob/uikit-sdk-contract 1.2.1 (2026-09-17)

### 新增

- **`UIKitFeatures` 新增两个可选开关**：`showNicknameInSingleChat`（单聊消息列表是否展示对方昵称，默认 false）、`showNicknameInGroupChat`（群聊消息列表是否展示发送者昵称，默认 true）。

## @easemob/uikit-core 2.8.2 (2026-09-17)

### 修复

- **修复生产构建中 core 组件（按钮等）样式随 SFC 源码改动漂移失配的问题（严重）**：`@vitejs/plugin-vue` 4.x 生产构建的 scoped `data-v` hash = `hash(文件路径 + SFC 源码)`，任何 SFC 内容修改都会生成新 scopeId；而 `@easemob/uikit-im` 的 theme 内联的是 core dist 构建期固化的 scoped 样式，core 单独重构建（如 2.8.0 → 2.8.1 修改 EmButton）会使已发布的 im theme 里的 `data-v` 选择器全部失配，表现为消费方生产构建中按钮等 core 组件**失去全部样式**。修复：升级 `@vitejs/plugin-vue` 至 ^5.2.4 并统一启用 `features.componentIdGenerator: 'filepath'`，scoped hash 仅由文件路径决定、与源码内容无关，重复构建保持稳定；新增构建守卫 `scripts/check-theme-scope-ids.mjs`（core / uikit-im / uikit-chatroom 构建链接入），theme CSS 中出现运行时无法匹配的 scoped hash 时立即构建失败，杜绝再次静默产坏包。

## @easemob/uikit-im 3.7.2 (2026-09-17)

### 修复

- **修复生产构建中 core 组件（按钮等）失去全部样式的问题（严重）**：配套 core 2.8.2 的 scopeId 稳定性修复——theme 内联的 core dist scoped 样式 hash 与 core 运行时 scopeId 重新对齐；同时构建接入 `check-theme-scope-ids.mjs` 守卫，core dist 过期导致的 theme 失配会在构建期直接报错。修复前典型症状：消费者仅 `import '@easemob/uikit-im/theme'` 时，页面中所有 EmButton 渲染为无样式原生按钮。

## @easemob/uikit-core 2.8.1 (2026-09-16)

### 变更

- **`componentsShape` 方正档改为真直角（视觉变更）**：`square` 档 `--uikit-components-radius` 由 4px 改为 **0px**（`--uikit-components-radius-hover` 同步 10px → 0px）。原 4px 与圆润档 8px 在卡片 / 弹窗 / 按钮上肉眼几乎无差别，实测用户感知为开关失效；方正档现在呈现明确的直角风格（business 预设同步受影响）。同时清理 EmButton 中无人设置 `data-uikit-components-radius` 属性的失效 legacy 选择器（pill 按钮保持胶囊不受开关影响）。

## @easemob/uikit-im 3.7.1 (2026-09-16)

### 修复

- **修复会话列表 card 变体屏蔽全局 hover 风格开关**：`.conversation-list--card` 不再硬编码 `--uikit-item-hover-radius` / `--uikit-item-active-radius`（原固定 8px），改由全局 `hoverStyle` 主题开关驱动；默认档同为 8px，card 设计视觉不变，「方正」档直角、「圆角」档左右缩进在 PC 默认 card 会话列表上恢复生效（联系人 / 群组列表此前已生效）。

## @easemob/uikit-im 3.7.0 (2026-09-16)

### 变更

- **新增全局 header 底部分隔线开关（默认关闭，视觉变更）**：`theme.headerBorder`（Provider prop）/ `useTheme().setHeaderBorder()` 一键控制会话列表、通讯录、聊天、会话抽屉、EmModal 及建群弹窗 header 底部的 1px 分隔线，默认 `false` 不再显示分隔线（此前整改后默认显示）；宽度经新 token `--uikit-header-border-width`（`0px`/`1px`）下发，各 header 颜色 token 不变。header 总高由 border-box + 固定高保证，开关不影响布局高度。配套 core 2.8.0。

## @easemob/uikit-core 2.8.0 (2026-09-16)

### 变更

- **新增全局 header 底部分隔线开关 `headerBorder`**：`themeStore.headerBorder`（持久化，默认 `false`）驱动新 token `--uikit-header-border-width`（`0px`/`1px`）；`ProviderThemeConfig` 新增 `headerBorder?: boolean`，`useTheme()` 新增 `headerBorder` / `setHeaderBorder()`。
- **EmModal `showHeaderDivider` 默认行为变化**：默认值由 `true` 改为「不传时跟随全局 `headerBorder` 开关（默认关闭）」，显式传 `true`/`false` 仍优先（沿用 Avatar `shape` 回落主题的惯例）。此前依赖默认显示 header 分割线的弹窗，需开启全局开关或显式 `:show-header-divider="true"`。

## @easemob/uikit-im 3.6.1 (2026-09-16)

### 变更

- **二次确认弹窗宽度对齐设计稿**：11 处 `type="warning"` 确认弹窗（删除会话/消息、解散/退出群、移除成员、设置/移除管理员、移出黑名单、取消禁言、名片操作等）宽度由 540 校准为 **719**，与设计稿 pop 组件统一宽度一致；视觉跟随 core 2.7.1 的 EmModal 新度量（header 60px / 标题 18px·500 / body 48·56 / footer 80px）。
- **会话容器对齐「新-Demo」设计稿（视觉变更，无 API 变更）**：header 加底部 1px 分隔线、总高 48 → **65px**（上下 12.5px），标题 16px/600 → **18px/500**；搜索框改 **36px 胶囊**（`pill`），搜索槽/分栏/标题水平边界统一 **12px**；card 变体会话项总高 72 → **64px**（项内容水平内边距 12px、垂直 8px），两行摘要间距 6 → **4px**。
- **修复会话项无最后一条消息时标题下移**：会话项两行高度固定（20 + 4 + 18 = 42px），消息摘要为空时信息区不再塌陷，标题位置恒定。
- **「没有更多历史消息」改为随消息流滚动（行为变更 + 新插槽）**：历史加载状态提示（加载中 / 失败重试 / 没有更多）由常驻顶部条改为消息列表首项，仅上翻到顶（或下拉到底）时可见，随消息一起滚动；下拉刷新模式历史加载完后同样显示「没有更多历史消息」。新增 `#history-tip` 插槽整块接管该提示，scope `{ state: 'loading' | 'failed' | 'no-more', retry }`，链路 `EmChatContainer → EmChat → EmMessageList` 插槽自动透传，文案仍可用 locale key `conversation.noMoreHistory` 覆盖。

## @easemob/uikit-core 2.7.1 (2026-09-16)

### 变更

- **EmModal 度量对齐设计稿（视觉变更，无 API 变更）**：header 高 60px（`padding 13px 12px 13px 16px`，标题 18px/Medium）；body 默认 padding 24px → **56px 48px**、默认字号 14 → **18px**（`bodyFlush` 贴边形态不变，承接表单/穿梭/列表场景）；正文语义图标 56 → **72px**；footer 高 80px（`padding 16px 22px`，按钮间距 16 → 12）；外壳移除 1px 描边（设计稿仅阴影），圆角仍跟随 `--uikit-components-radius`、阴影走 `--uikit-shadow`。移动端 bottom-sheet 分支保持原有紧凑度量不受影响。

## @easemob/uikit-im 3.6.0 (2026-09-16)

### 变更

- **Provider 能力开关默认对齐产品化形态（行为变更）**：`enableContact` / `enableBlocklist` / `enablePresence` 默认由 `false` 改为 `true`（双 Demo 共识配置下沉）。好友/黑名单/在线状态开箱即用；presence 订阅会带来额外查询/订阅请求，私有化或低频场景请显式 `:enable-presence="false"`。
- **输入框发送按钮条件默认（行为变更）**：`config.input.showSendButton` 未配置时由「一律显示」改为按端型取默认——PC 隐藏（回车发送，对齐桌面 IM 形态）、移动端显示（触屏无回车键）；显式 true/false 仍优先。此前 PC 上依赖默认发送按钮的接入方需显式 `showSendButton: true`。
- **会话列表下拉刷新增回落链（能力补齐）**：`EmConversationContainer` 的 `pull-refresh` 未配置（undefined）时回落 Provider `h5.pullRefresh`（默认 `'auto'`：触屏设备自动开启），不再写死 `false`；显式 true/false 仍优先。
- **ChatContainer 容器风格条件默认（行为变更）**：`variant` 未配置时由一律 `'compact'` 改为按端型取默认——PC `'card'`（圆角卡片壳由容器自绘）、移动端 `'compact'`（平铺全屏形态）；显式传入仍优先。此前 PC 上未传 variant 的接入方视觉会变为卡片壳，如需平铺请显式 `variant="compact"`。

## @easemob/uikit-core 2.7.0 (2026-09-16)

### 变更

- **能力开关默认对齐产品化形态（行为变更）**：`defaultFeatures` 与 core `UIKitProvider` 的 `enableContact` / `enableBlocklist` / `enablePresence` 默认由 `false` 改为 `true`（此前 Provider 保守默认与 defaultFeatures 故意不一致，现对齐）；`usePresence` 关闭告警文案同步更新。presence 订阅有额外请求成本，私有化或低频场景显式关闭。

## @easemob/uikit-sdk-websdk5 1.3.0 (2026-09-16)

### 变更

- **`getDefaultFeatures()` 的 `enablePresence` 默认由 `false` 改为 `true`**：adapter 独立运行或未传 features 时与 UIKit Provider 3.6.0 默认对齐（在线状态为产品化默认形态）；注意订阅/查询会带来额外请求，私有化或低频场景应显式关闭。

## @easemob/uikit-sdk-webim4 1.3.0 (2026-09-16)

### 变更

- **同 websdk5 1.3.0**：`getDefaultFeatures()` 的 `enablePresence` 默认由 `false` 改为 `true`。

## @easemob/uikit-im 3.5.1 (2026-09-15)

### 变更

- **「新会话」弹窗宽度调宽**：`new-chat-modal` 弹窗宽度由 360px 调整为 480px（PC 端内联 `width`），移动端（<768px）全屏分支不受影响。

## @easemob/uikit-im 3.5.0 (2026-09-04)

### 变更

- **文件消息气泡整改（设计规范）**：文件图标改为左侧固定展示的彩色底色块（双方气泡一致），按扩展名归类取图标——pdf / xls / doc / ppt / md 明确格式各用明确图标，图片 / 视频 / 音频按类别用 `file/img` / `file/video` / `file/audio`，未识别类型回落 `file/empty`；图标底色为类型品牌色 token（见 core 2.6.0），图标本体白色。文件标题改用 `EmText`（body 14px / medium / 单行 ellipsis），颜色跟随气泡文字色（对方 `#171A1C`、己方 `#FFFFFF`）。气泡圆角沿用 round 16px / square 8px 两档，但文件卡片默认 square（8px，设计约定），可经 `config.messageList.bubbleShape` 切 round。

## @easemob/uikit-core 2.6.0 (2026-09-04)

### 新增

- **文件类型图标底色 token**：`--uikit-file-icon-{pdf,xls,doc,ppt,md,img,video,audio,file}` 品牌识别色（pdf `#E5252A` / xls `#1D7044` / doc `#2B5797` / ppt `#D24625` / md `#424242` / img `#00897B` / video `#E91E63` / audio `#7B1FA2` / 未识别普通文件 `#4CAF50`），明暗模式通用。

## @easemob/uikit-im 3.4.0 (2026-09-03)

### 新增

- **ChatContainer 容器风格档位 `variant`**：`compact`（默认；平铺无圆角，`--uikit-chat-bg` 铺满，保持现状不破坏存量接入）/ `card`（圆角卡片：圆角跟随 `--uikit-components-radius`，细边框 `--uikit-border-light`，overflow 裁剪内部直角；灰底与间距由宿主布局提供），与 `ConversationContainer` 的 card/compact 同口径——此前卡片壳需接入方在宿主布局手搓，现收回容器内。
- **`EmText` 排版原子组件 re-export**：与 core 2.5.0 对齐，`@easemob/uikit-im` 侧同步导出 `EmText` 及 `TextProps` / `TextLevel` / `TextWeight` / `TextColor` 类型（见 core 2.5.0）。
- **中性气泡样式档位 `config.messageList.bubbleStyle`**：`'filled'`（默认，对方气泡带底色）/ `'plain'`（对方气泡无底色纯文字，message-list 根作用域覆写 `--uikit-bubble-bg-other: transparent`，组件级变体范式，不影响全局主题）。
- **对方语音消息未播放红点 `config.messageList.voiceUnreadDot`**：默认 `true`。本会话实时收到的对方语音未点击时，气泡外侧右侧、相对气泡垂直居中显示红点，点击播放后隐藏；历史/漫游消息无播放状态不打标，刷新页面即复位（运行时态，不落盘）。设为 `false` 全局关闭；单条消息级覆盖可在消息项插槽内对 `INJECTION_KEY.VOICE_UNREAD_DOT` 深一层 provide。

### 变更

- **消息气泡圆角档位校准（设计规范）**：`bubbleShape` 两档取值由 12px/4px 校准为 round=16px（默认）/ square=8px，新增 token `--uikit-bubble-radius` / `--uikit-bubble-radius-square`（见 core 2.5.0）；文本/语音/图片/视频气泡与引用卡片（0.75 倍圆角：round 档 12px 更椭圆、square 档 6px 保持原样）跟随档位，文件/位置/合并/自定义气泡补齐 `bubbleShape` 消费（此前未接线）。
- **气泡默认色校准（设计规范）**：对方气泡 `#E4E6E7` / 文字 `#171A1C`，己方气泡 `#009EFF` / 文字 `#FFFFFF`；己方气泡背景不再跟随主色（运行时仍可用 `setBubbleBg` / 主题预设覆盖）。
- **译文 / 语音转文字并入原气泡**：不再以独立卡片吸顶气泡下方，改为同一气泡内 1px 分割线分隔（新 token `--uikit-bubble-divider-other` / `--uikit-bubble-divider-self`）；语音气泡展示转写时宽度由按时长固定改为随内容自适应；己方气泡内译文链接与加载态配色同步修正。
- **消息状态默认位置改为气泡末尾**：`messageStatus.position` 默认由 `'below'`（气泡下方）改为 `'inline'`（气泡末尾、多行气泡与底部对齐），`'below'` 仍可显式配置。

### 修复

- **ChatContainer card 档外侧出现滚动条**：`.chat-container` 补 `box-sizing: border-box`，card 档 1px 边框不再把 `height: 100%` 撑出 2px 导致宿主溢出（顺带消除 H5 safe-bottom padding 的同类撑高隐患）。
- **inline 消息状态落在引用卡上 / 跟随引用卡宽度**：带引用的消息在 `statusPosition: 'inline'` 下，状态列此前相对「气泡 + 引用卡」整体居中/沉底，视觉上贴在引用卡左侧；现将引用卡移出 message-row，且 message-row 内 body 宽度由 `100%` 改为随气泡内容收缩（`fit-content`），状态列只相对气泡本体对齐（多行沉底检测同步只量气泡），不再被引用卡宽度顶到远处。
- **译文 / 语音转写缺少完成态标签**：译文展示时气泡底部新增「已翻译 / Translated」标签（icon `rect/hanzinalpha/slash`），语音转写新增同款「已转文字 / Transcribed」标签（icon `rect/hanzi`），双方气泡均居右对齐；locale 新增 `message.translated` / `message.voiceToText.done`（中英双语）。引用卡片去掉左侧竖杠装饰。

## @easemob/uikit-core 2.5.0 (2026-09-03)

### 新增

- **`EmText` 排版原子组件**（TECH-DEBT D127）：`level` 对齐设计师 Value.tokens.json 9 档（h0=34 / h1=28 / h2=22 / h3=18 / body-lg=16 / body=14 / caption=12 / small=10 / mini=8）并补 `body-sm`（13px）；每档内置「字号 + 行高」配对（行高按稿值换算为 `calc(Npx × --uikit-font-scale)`，跟随适老缩放）与默认字重；`weight`（regular / medium / semibold / bold）可覆盖默认字重，`color`（primary / secondary / tertiary / inverse）走语义 token，`ellipsis` 单行截断，`tag` 默认 `span`。新增后不全库回改，新代码用、老代码渐进迁移。
- **字号 token 补两档大标题**：`--uikit-font-size-28` / `--uikit-font-size-34`（明暗两段，× `--uikit-font-scale`）。
- **字体族栈首声明设计规范字体**：`--uikit-font-family` 栈首加 `'Inter'`（拉丁字形）/ `'Noto Sans SC'`（中文），本机未安装时自动回落 PingFang SC / 雅黑 / 思源黑体等系统字体栈；库不内置网络字体加载，需要精确字形时由接入方自行引入 webfont。
- **气泡语义 token 扩展与默认值校准（设计规范）**：新增 `--uikit-bubble-radius`（round 档 16px，默认）/ `--uikit-bubble-radius-square`（square 档 8px）与气泡内分割线 `--uikit-bubble-divider-other` / `--uikit-bubble-divider-self`（明暗两段）；气泡默认色校准为对方 `#E4E6E7` / `#171A1C`、己方 `#009EFF` / `#FFFFFF`（暗色段：对方沿用表面色与文字色，己方保持品牌蓝 `#009EFF`）。
- **`INJECTION_KEY.VOICE_UNREAD_DOT` 注入键**：语音未读红点开关的 provide/inject 通道（`ComputedRef<boolean | undefined>`，undefined 回落默认 true），支持消息项级深一层 provide 覆盖。

## @easemob/uikit-im 3.3.0 (2026-09-03)

### 新增

- **被踢下线识别与差异化提示**：会话列表连接横幅新增「被踢」最高优先级分支（不可点击重连），按 SDK 错误码差异化文案（其他设备登录 / 密码已修改 / 设备数超限 / 被迫下线，新增 4 个 locale key `status.kicked*`，中英双语），修复账号被踢后误显示「网络异常/断开」的问题。

### 变更

- **菜单项圆角与 hover 档位联动**：消息操作菜单、会话右键菜单的菜单项圆角统一由 `--uikit-components-radius` 改为 `--uikit-item-hover-radius`，随 `hoverStyle` 三档联动（square 档为直角）。

## @easemob/uikit-core 2.4.0 (2026-09-03)

### 新增

- **连接状态「被踢」账号态**：client store 新增 `kicked` / `kickCode` / `setKicked(code)`（`setConnected(true)` 与 `clearClient` 自动清除），供 UI 区分账号终态与网络异常。
- **列表项 hover 风格第三档 `square`**：`HoverStyle` 扩为 `'default' | 'rounded' | 'square'`（直角整行高亮，radius 归零）；`business` 预设默认改为 `square`；`theme/index.css` `:root` 补齐 `--uikit-item-hover-radius` / `--uikit-item-active-radius` / `--uikit-item-hover-margin-x` / `--uikit-item-hover-padding-x` 静态默认（8px，与 `default` 档一致），未接 themeStore 的场景不再缺变量。
- **Input `pill` 椭圆档**：显式 prop（border-radius 9999px、整体高度 36px、垂直 padding 8px），优先级高于主题 `componentsShape`；默认 `false` 保持圆角矩形。新增语义 token `--uikit-input-border-color`（default 变体边框，浅 `#F5F5F5` / 深 `#374151`）。
- locale 新增 `status.kickedAnotherDevice` / `status.kickedPasswordChanged` / `status.kickedDeviceLimit` / `status.kickedOffline`（中英双语）。

### 修复

- **Input 带前缀图标比例校准**：search/filled 变体下前缀图标左缩进 8px、文字 `padding-left` 28px（图标 8 + 图标宽 16 + 间距 4 的设计规格），修复图标过于靠左的问题（删除两条老的 `left: 4px` 覆盖）。

## @easemob/uikit-sdk-contract 1.2.0 (2026-09-03)

### 新增

- **被踢错误码契约**：`KICK_ERROR_CODE`（206 多端互踢 / 207 账号注销 / 214 设备数超限 / 216 修改密码 / 217 被其他设备踢下线，websdk 两代同码）与类型守卫 `isKickErrorCode()`。

## @easemob/uikit-sdk-websdk5 1.2.2 (2026-09-03)

### 新增

- **语音未播放打标**：`onMessage` 实时收到对方语音消息时调用 `stores.message.markVoiceUnplayed?.(msgId)`（`MessageStoreLike` 新增可选方法，chatroom 等场景 store 可缺省），支撑 UI 层语音未读红点；历史/漫游路径不打标。

### 修复

- **被踢误报网络异常**：`onDisconnected` 按错误码识别被踢/账号失效（取 `payload.errorCode`），命中 `KICK_ERROR_CODE` 时调用 `client.setKicked(code)` 标记账号终态，而非仅置 disconnected；内置 client store 的 `EventStores` 结构补 `setKicked`；新增 `connection-events` 回归测试。

## @easemob/uikit-sdk-webim4 1.2.2 (2026-09-03)

### 新增

- **语音未播放打标（与 websdk5 同口径）**：`onMessage` 实时收到对方语音消息时调用 `stores.message.markVoiceUnplayed?.(msgId)`（`MessageStoreLike` 新增可选方法）。

### 修复

- **被踢误报网络异常（与 websdk5 同口径）**：`onDisconnected` 按 `error.type` 识别被踢/账号失效并 `client.setKicked(code)`；内置 client store 的 `EventStores` 结构补 `setKicked`；新增 `connection-events` 回归测试。

## @easemob/uikit-im 3.2.0 (2026-09-02)

### 新增

- **会话列表风格变体**：`ConversationContainer` / `ConversationList` 新增 `variant`（`card` 默认：圆角白卡、无分割线、项间距 4px / `compact`：无圆角、无分割线、零间距，列表根作用域覆写 Cell 变量实现，不影响全局主题）、`showAvatar`（false = 仅会话信息模式）、`unreadPlacement`（`avatar` 时未读徽标带白描边挂在头像右上角）；`badgePlacement` 三层透传统一未读徽标位置。
- **会话项扩展与事件**：新增 `#name-suffix` 插槽（名字后企业/官方 tag，list 层 `#item-name-suffix`、container 层 `#itemNameSuffix` 透传，scope 含会话数据）；新增 `search` 事件（去空格关键字，埋点/远程搜索用）。
- **会话列表自带底色**：`--uikit-conversation-list-bg`（浅 `#FAFAFA` / 深 `#111827`），card 变体下头部/分栏/搜索与卡片项边界对齐、头部与项内容线对齐。
- **空状态规格化**：会话列表空态启用新图标 `list/bullet`（100×100 占位色 + 16px 文案 + 垂直居中，规格走 `--uikit-empty-*` token）；聊天区无会话空态图标换 `bubble/rect/2`，默认文案「选择一个会话」。

### 变更

- **会话项排版对齐设计规范**：用户名 16px/600、时间 12px tertiary、消息预览 14px，两行行距 6px；置顶底色与 hover 同值（`--uikit-bg-hover`）；置顶/免打扰图标换面性图标（`filled/pin` / `filled/bell/slash`，`--uikit-icon-muted` 同色）且置顶补齐与免打扰一致的摇动动画；免打扰/dot 模式未读点校准为 8×8、`#FF7070`（去除免打扰染灰的历史行为）。

### 破坏性行为变更

- `EmBadge` 的 `size` 枚举由 `'normal' | 'small'` 改为 `'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'`（默认 `'l'`），旧值不再合法（见 core 2.3.0）。

## @easemob/uikit-core 2.3.0 (2026-09-02)

### 新增

- **Badge 档位体系**：尺寸扩为六档 `xs`（仅 8px 圆点）/ `s` / `m` / `l`（默认）/ `xl` / `xxl`（单位数正圆、多位数药丸按规格表）；新增 `placement`（`top-right` 默认 / `bottom-right`）与 `bordered`（2px 描边与头像分界，`box-shadow` 外环实现、随背景色自适应、不与 stroked 描边冲突）；新增导出类型 `BadgePlacement`。
- **语义 token**：`--uikit-cell-bg`（Cell 项背景，默认透明，会话列表 card 变体覆写为浮层色）、`--uikit-conversation-list-bg`、`--uikit-empty-icon-color` / `--uikit-empty-text-color`、`--uikit-badge-bg`（徽标默认背景 `#FF7070`，独立于 danger 语义色）；新增图标 `list/bullet`，`filled/pin` 更换新版资源。

### 变更

- **token 默认值校准（对齐设计色板）**：`--uikit-bg-hover` 浅 `#e5e7eb` → `#F5F5F5`；`--uikit-bg-active` 浅色 alpha 0.08 → 0.12（≈ 主色 12% 叠白，视觉对齐 `#E5F5FF` 且保持跟随主色）；`--uikit-icon-muted` 浅 `#B6B8BF` → `#949A9E`。
- locale 默认文案：`conversation.empty`「暂无会话」→「没有会话」，`chat.empty`「请选择会话」→「选择一个会话」（en 同步为 `Select a conversation`）。

### 破坏性行为变更

- **`BadgeSize` 枚举重定义**：`'normal' | 'small'` → `'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'`，`size` prop 默认值 `'l'`；Badge 默认色由 `--uikit-danger-color` 改为 `--uikit-badge-bg`（`#FF7070`）。

## @easemob/uikit-sdk-websdk5 1.2.1 (2026-09-02)

### 修复

- **免打扰状态被会话快照冲掉**：`mergeWithExistingConversations` 合并重叠会话时 `isMuted` / `remindType` 以本地为准（SDK 会话快照恒 DEFAULT 不携带该状态），修复设置/解除免打扰后来新消息即被重置的问题；权威同步通道（`setMuted` 回写 / `CONVERSATION_MUTE_INFO_CHANGED` / `patchConversationMuteStates`）语义不变，合并回归测试补 `isMuted` 保留断言。

## @easemob/uikit-sdk-webim4 1.2.1 (2026-09-02)

### 修复

- **免打扰状态被会话回填冲掉**：`mergeIncomingConversations` 同 websdk5 1.2.1 口径，共有项保留本地 `isMuted`（回填项恒 false 不携带）；权威同步通道（`setMuted` 回写 / `patchMuteStates`）语义不变，回归测试同步补断言。

## @easemob/uikit-core 2.2.0 (2026-09-02)

### 新增

- **`SdkConfig.persistence` 透传槽**：旁路写库钩子（`SdkPersistenceHooks`）随 `repositories` 同路经 core 归一化下沉 `adapterConfig` 下发 adapter（`resolved.persistence ?? adapterConfig.persistence` 归一），未注入时行为零变化。

## @easemob/uikit-sdk-contract 1.1.0 (2026-09-02)

### 新增

- **旁路持久化契约（D122 Phase 3.2/3.4 前置）**：新增入库 DTO `MessageRecord`（`SdkMessage` + 墓碑字段 `recalled`/`deleted`/`tombstoneTime`）与 `ConversationRecord`；新增清洗函数 `toMessageRecord`/`toConversationRecord`（纯 TS，剥离 File/Blob/函数、combine `messageList` 递归、`ext` 限深防循环引用）；新增 `SdkPersistenceHooks`（`message`/`conversation` 两域钩子，全部可选、fire-and-forget 语义）；`SdkConfig` 新增 `persistence` 槽（旁路写库，与 `repositories` 数据入口接管语义分立）。

## @easemob/uikit-sdk-websdk5 1.2.0 (2026-09-02)

### 新增

- **旁路写库钩子接线**：发送成功 / SDK 漫游回流 / 收消息 / 撤回（含本端主动撤回即落墓碑）/ 编辑 / 送达与单聊已读回执 / 多设备删除 / 会话列表回填，逐点触发 `persistence` 钩子（fire-and-forget，失败仅告警不阻塞）；repository 注入路径（数据来自本地库）不写回；流式分片不落库（完整消息经 onMessage/漫游路径落库）。

### 修复

- **会话覆盖竞争（D122 3.3）**：`mergeWithExistingConversations` 升级为并集合并——本地独有会话（如 DB 预填）不再被 SDK 快照冲掉，重叠会话保留本地 `draft`/`draftTime`/`remindType` 字段；`patch.removed` 显式删除通道不受影响。

## @easemob/uikit-sdk-webim4 1.2.0 (2026-09-02)

### 新增

- **旁路写库钩子接线（与 websdk5 同构对齐）**：同一套 `persistence` 语义点按 4.x 事件模型接入（含 4.x 特有的 `onModifiedMessage` 编辑、`deleteRoaming` 多设备删除按会话粒度展开为消息 ID 集）。

### 修复

- **会话回填并集合并**：`applyServerItems`/注入路径 `refresh` 不再冲掉本地独有会话，共有项继承本地 `draft`/`draftTime`/`remindType`；顺带修复 4.x 收到 `deleteRoaming` 多设备删除事件时本地 store 未清理的问题。

## @easemob/uikit-im 3.1.0 (2026-09-02)

### 新增

- **会话消息内存淘汰（opt-in）**：`MessageStoreOptions` 新增 `maxCachedConversations`，开启后按 LRU 淘汰超额会话的消息缓存（联动清理合并消息/已读成员/@我/发送中缓存，并重置历史翻页游标），最近活跃会话受保护；默认不开启，Web 行为完全不变。面向 Electron/桌面端长期挂机场景，为本地持久化专项预留衔接点（淘汰后回访经 fetchHistory 漫游回源，DB 阶段由 repository 本地回源无缝接管）。

### 性能

- **消息 store 热路径优化**：单条消息插入改「尾序快路径 + 二分插入」，去除每消息全量拷贝排序；`_findMessageById` 维护 msgId→会话索引（未命中回退全表扫描并自愈），回执/撤回/编辑/删除等按 ID 定位从「全会话全表扫描」降为单会话内定位。
- **presence 全链路默认关闭**：`usePresence` composable 层增加开关硬门（见 websdk5/webim4 行为变更）；会话列表 presence 订阅改无条件 watch + 空数组源，修复运行时再开启不生效的问题。

### 修复

- 会话右键菜单锚点节点、消息定位高亮定时器补充卸载清理；消息气泡缩略图加 `loading="lazy"`。

## @easemob/uikit-core 2.1.0 (2026-09-02)

### 性能

- **日志持久化空闲零唤醒**：log-store 落库定时器由常驻 `setInterval` 改为 `setTimeout` 链，缓冲清空即停表，消除 Electron/长会话场景每 2s 空转唤醒。

### 行为变更

- **`usePresence` 增加开关硬门**：`subscribePresence`/`unsubscribePresence`/`fetchPresence`/`publishPresence`/`watch` 在 `features.enablePresence === false` 时全部 no-op（fetch 返回空数组），不再依赖各调用点自觉 gate；开启时行为不变。

## @easemob/uikit-sdk-websdk5 1.1.0 (2026-09-02)

### 性能

- **用户资料拉取合批**：`fetchUserInfos` 同 tick 多次调用经微任务合并为一次底层请求（userIds 去重、attributes 取并集），消除大列表首渲染 N+1；防重与失败标记语义不变。

### 破坏性行为变更

- **presence 独立运行默认关闭**：`getDefaultFeatures()` 的 `enablePresence` 由 `true` 改为 `false`——adapter 独立运行或未传 features 时不再默认启用在线状态，仅 Provider 显式 `enablePresence` 开启才启用（Provider 路径默认本为 false，无影响）。

## @easemob/uikit-sdk-webim4 1.1.0 (2026-09-02)

### 性能

- **用户资料拉取合批**：同 websdk5 1.1.0，4.x 侧同构对齐（底层走 `fetchUserInfoById`，attributes 经 wire 映射）。

### 破坏性行为变更

- **presence 独立运行默认关闭**：同 websdk5 1.1.0。

## @easemob/uikit-im 3.0.0 (2026-09-02)

### 新增

- **双 SDK 适配架构落地（D122）**：SDK 层收敛为「中立契约 + 双 adapter」——新增契约包 `@easemob/uikit-sdk-contract` 与两个适配器包 `@easemob/uikit-sdk-websdk5`（5.x）/ `@easemob/uikit-sdk-webim4`（4.x 私有化，经 npm alias `easemob-websdk-4` 引入 4.24.2）。一套 UI 产物可按 SDK 版本切换，UI 层零重写。
- **子路径入口**：新增 `@easemob/uikit-im/websdk5` 与 `@easemob/uikit-im/webim4`（import 即自注册默认 adapter）；主入口保持零 adapter 值级静态引用，4.x 下游产物不含 5.x 符号，反之亦然（摇树隔离已双消费者工程验收）。
- **Provider 新能力**：新增 `adapter` prop（注入模式：业务自带 adapter 实例，UIKit 不转发 login/logout）；`sdkConfig.repositories` 数据入口注入（message/conversation/contact/group/presence/userInfo 全域可接管）；`useUIKit()` 暴露 `capabilities`（adapter 上报的 SDK 客观能力矩阵，与 features 取交集决定能力入口）；core 新增模块级 `getUIKitAdapter()` 支持非 Vue 上下文访问。
- **4.x 适配补齐**：登录后按 features 预取联系人/群组（对齐 5.x 同步体感）；漫游坏消息容错（单条解码失败跳过不拖垮整页）。

### 修复

- **群主转让状态校准**：4.x `changeOwner` 事件 payload 不携带新群主，经 pending 标记识别真正的 newOwner，同步校准群资料 owner、当前用户角色与新旧群主成员角色，避免角色闪回与权限残留。
- **建群成员数偏差**：创建群后用本地已知的创建成员数兜底校准 `memberCount`，避免服务端/事件导致的短暂计数偏差。

### 破坏性行为变更

- **SDK 层值级导出迁移**：`UIKitClient` / `createClient` / adapter / domain / `registerEventHandlers` 等值级导出从主入口移除，迁至子路径入口 `@easemob/uikit-im/websdk5`（4.x 场景用 `@easemob/uikit-im/webim4`）；主入口仅保留 type-only re-export。迁移方式：入口文件 `import '@easemob/uikit-im/websdk5'`（import 即注册默认 adapter），原先从主入口导入的 SDK 值级符号改从子路径入口导入。
- **`UIKitDataSource` 维持 `@deprecated`（本版本不移除）**：已收口为 repository 注入的薄别名（core 装配时逐项翻译，显式 `repositories` 优先）；`searchUsers` 等无 repository 对应项的接管面迁移目标尚未设计，移除调整至 4.0.0。

## @easemob/uikit-core 2.0.0 (2026-09-02)

### 破坏性行为变更

- **SDK 装配改 adapter 驱动**：移除 `createClient` / `UIKitClient` / `ManagerHost` / `registerEventHandlers` 老路；`useCoreUIKitProvider` 重写为纯 adapter 驱动（init/login/logout/subscribe），业务 store 经 `adapterConfig.stores` 注入，事件依赖（i18n/通知）经 `adapterConfig.eventDeps` 注入；`onClientSetup` 替换为 `onAdapterReady`（logout/重初始化/卸载三处 dispose）。
- **引擎层隔离门禁**：core 引擎层（sdk/constants/utils）禁止 vue/pinia/@vueuse 与 `easemob-websdk` 的值 + 类型依赖（`check-engine-isolation.mjs`，构建前置）。

### 新增

- **dataSource 薄别名收口**：新增 `composables/data-source-repositories.ts`，把 `dataSource` 逐项翻译为 `SdkRepositoryOverrides` 注入 adapter Domain（惰性 getter 保持运行时切换语义，显式 `repositories` 按域整体优先）。
- `useSyncStatus` 下沉 core（onSyncStatus 桥接）；`formatSdkError` / `parsePresenceStatus` / `toUiMessage` 去 websdk5 依赖（鸭子类型判定）。

## @easemob/uikit-chatroom 2.0.0 (2026-09-02)

### 破坏性行为变更

- **SDK 解耦对齐双 adapter 架构**：公开导出 `resolveChatroomClientConfig` / `CHATROOM_SDK_MANAGERS` 移除，替换为 `resolveChatroomSdkConfig`；`onClientSetup` 改为 `onAdapterReady`；manager 注入改 adapter 预设 `managerPreset: 'chatroom'`；`ManagerHost` 改本包 `ChatroomSdkHost`（惰性代理解析 adapter.client）。本包不再直接依赖 `@easemob/uikit-sdk-websdk5`，adapter 由业务侧注入或经默认工厂注册。

## @easemob/uikit-sdk-contract 1.0.0 (2026-09-02)

### 新增

- **首次发布**：SDK 中立契约包——中立 wire 类型（`SdkMessage` / `UiMessage` / `UiConversation` / `UiGroup` / `UserInfo` 等）、常量、事件集、repository 数据入口接口、domains 业务域接口（Domain Port）、`SdkCapabilities` 能力矩阵（boolean 能力位 + `contractVersion` / `meta.reason` / `minContractVersion` 协商机制）、`SdkAdapter` 组合接口与初始化配置，及少量中立纯工具（logger / normalizeUserId / message-preview / stream-message）。零 SDK、零 UI 框架依赖。

## @easemob/uikit-sdk-websdk5 1.0.0 (2026-09-02)

### 新增

- **首次发布**：easemob-websdk 5.x 适配器——`Websdk5Adapter`（内置 / 注入双模式）+ 六域 Domain（message/conversation/contact/group/presence/userInfo）+ 事件层 + 中立字段映射 + 六 repository 代理 + 新消息通知引擎，实现 `@easemob/uikit-sdk-contract` 全部接口；`SdkRepositoryOverrides` 全域可注入。

## @easemob/uikit-sdk-webim4 1.0.0 (2026-09-02)

### 新增

- **首次发布**：easemob-websdk 4.x（4.24.2，私有化）适配器——`Webim4Adapter`（内置 / 注入双模式）+ 六域 Domain + 单 `addEventHandler` 事件层归一化（批量 onMessage 逐条展开、read/delivery/channel 回执归一、流式增量、群事件 operation 分发）+ 字段/API 映射（合并/置顶/流式/已读回执全支持）+ 登录预取（对齐 5.x 同步体感）+ 漫游 pb 容错（坏消息跳过不拖垮整页）。4.x SDK 经 npm alias `easemob-websdk-4` 引入，与 5.x 同工程共存互不干扰。

## @easemob/uikit-im 2.8.6 (2026-08-28)

### 修复

- **数据同步「有数据但 UI 空」**：SDK 自动同步完成后好友/群组列表仍可能为空——通讯录计数、列表容器挂载等路径在同步完成前读 SDK 内存（尚未同步的空快照）并锁定 `loaded`，导致 `onSyncDataFinished` 的回填被 `if (!loaded)` 跳过（日志呈现 `contact 回填 {loaded: true, sdkCount: N, storeCount: 0}`）。修复三层配合：① 计数改为只读（`getLocalCount()` 不写 store 不锁定 loaded）；② 回填兜底（`loaded` 为真但列表为空时仍回填 SDK 数据）；③ 消费 `onSyncDataFinished` 的 `status` 字段——同步失败输出日志，conversation 失败且可重试时自动 `refreshSessionList()` 重试一次。
- **新增 `useSyncStatus()` hook**：暴露 conversation / contact / group 三类数据的同步阶段（idle / syncing / success / failed）与 `isSyncing` / `allFinished`，业务方可感知同步进度并在失败后自行补偿（contact/group 无 SDK 主动同步接口，失败后只能等待下次连接/登录自动同步）。

## @easemob/uikit-im 2.8.5 (2026-08-28)

### 修复

- **GIF / 表情包发送后动图不播放（服务端返回静态图地址）**：`sendImage` 发送图片消息时未给 SDK 传 `createImageMessage` 的 `isGif` 标记，SDK 把 GIF 当普通图片上传，返回的 `chatfiles/*` 地址是静态图。现按 MIME（`image/gif`）或文件名/URL 后缀（`.gif`）自动判定并传 `isGif: true`，SDK 按 GIF 动图处理，配合 2.8.4 的渲染修复（`isGif` 消息展示动画原图）动图可正常播放。

## @easemob/uikit-im 2.8.4 (2026-08-28)

### 修复

- **GIF / 表情包消息展示为静态缩略图、不播放动图**：`image-message.vue` 的 `displayUrl` 对图片消息统一优先 `thumbnailUrl`（SDK 生成的静态缩略图），当消息体 `isGif` 为真（或 `ext.isSticker` 表情包）时改为优先展示动画原图（`originalImageUrl` / `bigImageUrl` / `localUrl`），恢复 gif 动图播放。

## @easemob/uikit-im 2.8.3 (2026-08-28)

### 修复

- **表情包（sticker）发送失败**：本地打包资源（如 demo 的 gif 资产路径）作为 sticker `url` 时，SDK 无法按 URL 上传（`Attachment file is required`）。现 `onStickerSelect` 先 `fetch` 该地址转成 `File` 再以图片消息发送；远程 URL 能 fetch 也走 File，跨域失败则回落为原 URL 字符串（保持按 URL 引用）。

## @easemob/uikit-im 2.8.2 (2026-08-28)

### 调整

- **表情面板「常用」区仅在有最近使用时显示**：从未选过表情不展示「常用」空态占位；`emoji.recentEmpty` 文案随之移除。
- **移除内置 emoji 悬停放大预览**：删除 `ChatConfig.input.emoji.emojiPreview` 配置，表情视图不再弹放大预览小窗；sticker 的 hover 预览图 → gif 切换保留不变。

## @easemob/uikit-core 1.5.2 (2026-08-28)

### 调整

- **EmojiPicker「常用」区空时隐藏**：仅当有最近使用 emoji 时展示「常用」区；移除 `emoji.recentEmpty` i18n key。
- **移除 `emojiPreview` prop**：删除内置 emoji 悬停放大预览气泡（逻辑 + 样式）；sticker 的 `stickerHover` 预览切换不受影响。

## @easemob/uikit-im 2.8.1 (2026-08-28)

### 调整

- **表情面板「常用」与「Emoji」合并为单一视图**：不再分「常用 / Emoji」两个 tab，改为在表情视图顶部展示「常用」最近使用区、下方为完整 Emoji 列表，同一滚动区（与设计稿对齐）；底部 tab 只区分表情视图与表情包。`recentIcon` 配置随之移除（无消费方）；`recent` / `recentCount` / `emojiIcon` / `emojiPreview` 等其余配置语义不变。

## @easemob/uikit-core 1.5.1 (2026-08-28)

### 调整

- **EmojiPicker「常用」与「Emoji」合并为单一视图**：常用最近使用区置于视图顶部、完整 Emoji 列表在下，同一滚动区；移除已无用的 `recentIcon` prop（`emojiIcon` 改为表情视图 tab 图标），其余 props（`recent` / `recentCount` / `tabsPosition` / `stickerHover` / `emojiPreview`）语义不变。

## @easemob/uikit-im 2.8.0 (2026-08-28)

### 新增

- **表情面板重构与配置化**（`EmEmojiPicker` / `ChatConfig.input.emoji`）：
  - 「常用」改为**动态最近使用**：默认开启、localStorage 按 `appKey + userId` 隔离持久化、保留最近 5 个（`recentCount` 可配）；关闭 `recent` 后不展示常用 tab 也不再记录；
  - 新增独立「Emoji」完整列表 tab；表情包（`stickerPacks`）注入的 tab **默认不自动选中**（打开时常用有内容优先常用，否则回落到 Emoji）；
  - 新增配置：`recent` / `recentCount` / `tabsPosition`（`top | bottom | left | right`，**默认 `bottom`**）/ `stickerHover` / `recentIcon` / `emojiIcon` / `emojiPreview`；
  - sticker 支持 `thumbUrl` 预览图 + `url` 动图 + `name` 标题：默认展示预览图，悬停切换 gif、移出恢复（触屏不启用）；内置 emoji 悬停放大预览（`emojiPreview` 可关）；
  - 每个 tab 项均可配预览小图：表情包取 `iconUrl`（缺省自动回落包内第一个 sticker 预览图），内置「常用 / Emoji」tab 走 `recentIcon` / `emojiIcon`。

### 修复

- **登出后重新登录，会话列表误展示「网络异常」横幅**（D123）：登出时 dispose 的事件处理器（连接级 + 各 manager + user-info 监听）在重新登录时未重建，导致 `stores.client.connected` 恒为 false、会话列表误命中网络异常分支；现 `login()` 在登出后先恢复注册再连接（根因修复见 `@easemob/uikit-core` 1.5.0）。

## @easemob/uikit-core 1.5.0 (2026-08-28)

### 新增

- **EmojiPicker 组件重构**：
  - 「常用」改为动态最近使用：`useUIKitStorage` 按 `appKey + userId` 隔离持久化（无 `<UIKitProvider>` 时降级内存），默认保留最近 5 个（`recentCount` 可配）；
  - 独立「Emoji」完整列表 tab（新增 `EMOJI_ALL` 常量）；表情包注入 tab 默认不自动选中；
  - 新增 props：`recent` / `recentCount` / `tabsPosition`（默认 `bottom`）/ `stickerHover` / `recentIcon` / `emojiIcon` / `emojiPreview`；支持 sticker hover 预览图 ↔ gif 切换、内置 emoji 悬停放大预览、每个 tab 项预览小图（表情包缺省自动回落包内第一个 sticker 预览图）；
  - 新增公开类型 `EmojiTabsPosition`；新增 i18n `emoji.full` / `emoji.recentEmpty`（zh-CN / en）。

### 修复

- **重登后事件处理器未恢复注册**（D123）：`useCoreUIKitProvider` 抽取 `registerClientSetup()`（幂等重建 `onClientSetup` 场景挂钩 + user-info 监听），`setupClient` 与 `login()` 共用；登出后重新登录先恢复注册再连接，连接事件不再无人消费；`client` 新增 `isConnected` 访问器。

## @easemob/uikit-im 2.7.0 (2026-08-27)

### 破坏性变更

- **输入框风格枚举更名**（`ChatConfig.input.style` / `InputStyle`）：`'feishu' | 'wechat'` 替换为 `'toolbar-top' | 'toolbar-bottom'`（脱离厂牌话术，改为工具栏方向语义），默认值由 `'wechat'` 变为 `'toolbar-top'`。迁移映射：`wechat`（工具栏在上）→ `toolbar-top`，`feishu`（工具栏在下）→ `toolbar-bottom`；旧值直接移除，下游调用方需同步替换。

### 新增

- **消息列表隐藏自己头像**（`ChatConfig.messageList.showSelfAvatar`）：新增 `showSelfAvatar` 配置（默认 `true`），设为 `false` 时隐藏己方消息头像、对方头像照常显示（微信/QQ 式「隐藏我的头像」）；`showAvatar: false` 仍作为总开关同时隐藏双方头像。

## @easemob/uikit-im 2.6.0 (2026-08-26)

### 破坏性变更

- **图标体系旧库清零，全面切换 V2**：删除 `packages/uikit-core/src/assets/icons/` 旧库目录；业务代码中所有空状态插画（`empty/*`）改用 V2 功能图标：`empty/contact`→`person/single`、`empty/chat`/`empty/conversation`→`bubble/rect/empty`、`empty/group`/`empty/members`→`person/double`、`empty/mutelist`→`bell/slash`、`empty/blocklist`→`circle/slash`、`empty/files`→`folder`、`empty/search`→`search`。`empty/mentions`、`files-media/doc_on_doc`、`status/info` 也已分别替换为 `at`、`rects`、`circle/bang`。
- 若业务侧此前通过 `EmIcon` 直接引用旧库 name（如 `empty/contact`），需按上述映射切换到 V2 name。

### 重构

- `check-icon-refs.mjs` 扩展为同时校验旧库与 V2 目录，旧库删除后仅校验 `assets/icons-v2/`；构建期缺失图标引用会硬失败。

## @easemob/uikit-core 1.4.0 (2026-08-26)

### 破坏性变更

- **图标资源目录整合**：`assets/icons-filled/` 下 7 个面性 SVG 迁移到 `assets/icons-v2/filled/`，`icon-map.ts` 移除独立 filled 注册表，面性图标 name 仍保持 `filled/` 前缀；`assets/icons/` 旧库整目录删除，V2 成为唯一图标库。
- 修复 3 个 V2 资源拼写错误：`singal`→`signal`、`rect/personnclock`→`rect/person-clock`、`rectnarrowreturn`→`rect/narrow-return`。

### 修复

- `icons:check` 脚本覆盖 `assets/icons-v2/`（含 `filled/`）与 `assets/icons/`，旧库删除后自动仅校验 V2；支持无 `src/` 目录的包扫描。

## @easemob/uikit-im 2.5.0 (2026-08-25)

### 新增

- **单聊抽屉拉黑**（`EmChatContainer` / `ChatInfoDrawer`）：单聊信息抽屉「通用操作」区新增「拉黑 / 取消拉黑」按钮（随 Provider `enableBlocklist` 显隐，黑名单关闭时隐藏），确认后调用黑名单能力并同步 store，抽屉新增 `block-changed` 事件。
- **黑名单选人拉黑**：通讯录黑名单列表右上角新增「+」入口（`EmAddressBookContainer` 黑名单子视图头部 + `EmBlockList` 自身 header），点击弹出 **`EmBlockListAddModal`** 选人弹窗（好友全量多选 + 搜索框，排除自己与已拉黑者），确定后批量加入黑名单并即时刷新列表；`EmContactContainer` 内置接线，业务零配置。新增 `showBlocklistAddButton` prop 与 `blocklist-add` 事件。

### 类型导出

- 新增 `BlockListAddModalProps` 公开类型。

## @easemob/uikit-im 2.4.0 (2026-08-25)

### 新增

- **通讯录黑名单同级入口**（`EmContactContainer` / `EmAddressBookContainer`）：
  - 新增 `showBlocklist` / `blocklistLabel` / `blocklistIcon` props、`blocklist-click` 事件与 `goBlocklist()` 命令式方法；黑名单入口在 Provider `enableBlocklist=true` 时展示，与「群组 / 通讯录(好友)」同级；
  - 新增黑名单列表组件 **`EmBlockList` / `EmBlockListContainer`**：空态占位、列表项复用 `EmContactItem` 并遵循头像形状主题配置，行右键菜单「移出黑名单」（确认后 `removeBlock` 并同步 store），对外事件 `click` / `contextmenu` / `unblock`，容器层透传 `blocklist-item-click` / `blocklist-item-contextmenu` / `blocklist-unblock`；
  - 新增 i18n `contact.entryBlocklist` 与 `contact.blocklist.*` 文案（zh-CN / en）。

### 类型导出

- 新增 `BlockListContainerProps` 公开类型。

## 2.3.0 (2026-08-20)

### 新增

- **会话列表接管能力**（`EmConversationList` / `EmConversationContainer`）：
  - `#item` 插槽完全接管会话项渲染，作用域提供 `{ conversation, active, keyboardFocus, select, pin, mute, delete, read, customAction }`（对齐 contact/group 列表的 `#item` 惯例）；
  - `menuItems` prop 注入 Header `+` 菜单自定义项（`ConversationHeaderMenuItem[]`），传空数组隐藏菜单入口；`#header-menu` 插槽整块接管菜单区域；未提供 handler 的自定义项触发 `header-menu-action` 事件；
  - `#new-chat` / `#add-contact` / `#create-group` 三个插槽分别接管「新建会话 / 添加联系人 / 创建群组」弹窗（作用域 `{ show, open, close }`），客户可接自己的选人器 / 好友体系 / 企业通讯录。
- **聊天页弹窗接管能力**（`EmChat` / `EmChatContainer`）：
  - `#user-card` / `#group-card` 插槽接管用户 / 群名片弹窗，`#invite-member` / `#forward` / `#message-search` / `#multi-select-bar` 插槽分别接管邀请成员 / 转发 / 搜索 / 多选栏渲染，默认内容 = 内置实现，不传插槽行为不变；
  - `#message-action-menu` 插槽完全接管消息操作菜单内容（PC 右键 Popup 与 H5 长按 ActionSheet 双端生效），作用域提供 `{ message, actions, select, close }`，支持插入自定义主菜单项（举报 / 收藏 / 业务菜单）。
- **群组模块接管能力**：群管理五个二级页新增 `#mute-list` / `#block-list` / `#allow-list` / `#shared-files` / `#join-requests` 插槽（`EmGroupManagementSection`）；成员操作菜单新增 `#member-menu` 插槽（`EmGroupMemberList`，作用域 `{ member, actions, select, close }`）。

### 类型导出

- 新增 `ConversationHeaderMenuItem` / `ConversationItemSlotScope` / `GroupManagementKey` / `GroupManagementSectionSlotScope` / `GroupMemberMoreAction` 公开类型。

## 2.2.0 (2026-08-20)

### 新增

- **Chat 抽屉三种接管能力**：`EmChatContainer` / `EmChat` 新增 `#drawer` 整块接管插槽；`ChatInfoDrawer` 新增 `drawer-header` / `drawer-profile` / `drawer-remark` / `drawer-announcement` / `drawer-members` / `drawer-admin-actions` / `drawer-management` / `drawer-actions` / `drawer-footer` / `drawer-member-detail` 十处 section 插槽；导出通用抽屉壳 `EmChatDrawer` 与 `ChatDrawerProps` / `ChatDrawerSlotScope` / `ChatInfoDrawerSlotScope` 类型。业务方可从整体替换、局部定制、自绘壳三个层级接管聊天信息抽屉。

### 破坏性变更

- 移除 `ChatConfig.header.customSlot` 字段（该字段此前未被代码读取，属于历史残留）。如需关闭默认抽屉入口，请改用新增的 `ChatConfig.header.showDrawerEntry`。

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

---

## @easemob/uikit-core 1.3.0 (2026-08-25)

### 新增

- **黑名单选人 i18n 文案**：新增 `contact.blocklist.add` / `contact.blocklist.emptySelectable` / `contact.blocklist.addSuccess` / `contact.blocklist.addFailed`（zh-CN / en），供黑名单「添加」选人弹窗使用。

## @easemob/uikit-core 1.2.0 (2026-08-25)

### 新增

- **通讯录黑名单 i18n 文案**：新增 `contact.entryBlocklist` 与 `contact.blocklist.empty` / `contact.blocklist.remove` / `contact.blocklist.removeConfirmTitle` / `contact.blocklist.removeConfirm` / `contact.blocklist.removeSuccess` / `contact.blocklist.removeFailed`（zh-CN / en），供 uikit-im 黑名单列表使用。

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


---

## @easemob/uikit-chatroom 1.0.0 (2026-08-15)

### 里程碑

- **首个稳定版（P5 文档与集成收尾）**：功能面完整（容器 / 场景预设 / PC 模式 / headless
  契约 / 弹幕流 / 直播组件集），文档站、集成 skill 与 MCP 数据齐备；自 0.3.0 起对外 API
  保持向后兼容，0.2.0 起的五变种 demo 页零回归。

### 新增

- **文档与集成（P5，设计文档 §九 P5）**：
  - `gen:api` 参数化支持聊天室包：`PACKAGES` 配置表驱动，输出隔离到
    `.vitepress/gen/chatroom/`（uikit-im 根目录零漂移）；props 查找支持同目录
    `types.ts` 声明（如 `ChatroomContainerProps`）与内联 `defineProps<{...}>()` 兜底；
  - docs 聊天室章节正式化：ChatroomContainer / 直播弹幕流 / 直播组件集（新页）/
    PC 模式组件页全部接入自动生成 API 表格，弹幕流页新增**运行 demo 块**（纯 UI 模拟数据）；
  - 聊天室集成 skill（`integrations/skills/chatroom`）：SKILL.md + quickstart /
    provider / components / danmaku / pc-mode / gotchas + 自动同步 API 明细；
    `gen-skill.mjs` 参数化双目标（IM + 聊天室）；
  - MCP 数据纳入聊天室：guide + 组件 API + manifest `chatroom` 段（独立 version），
    `search_docs` 搜索覆盖两包、`get_component_api` 兼容聊天室组件名。
- **工具链修正（P1 抽核遗留）**：`gen:api` 原子组件根目录跟随抽核迁移到
  `@easemob/uikit-core`（此前指向 `uikit-im/src/components` 会 ENOENT）；
  插槽提取增强——`name` 属性不在 `<slot` 首位的多行写法不再漏提取，
  容器 19 个命名插槽全量落表（此前仅 10 个）。
- **组件公开导出补全（文档整改自查）**：`ChatroomGiftBar`（礼物入口）与
  `ChatroomMicQueue`（语聊房麦位）此前仅模块层导出、未进包入口——补入直播组件集
  公开导出（组件文档与按需 import 可正常使用）。
- **`ChatroomGiftBar` 无 Provider 降级（文档演示修复）**：发送能力（`useChatroomMessage`）
  改为**探测式惰性获取**——先 `inject(CORE_UIKIT_CONTEXT_KEY, null)` 检测 Provider 上下文
  （带默认值不产生 inject 警告），无上下文（纯 UI 预览 / 文档演示）时降级为
  「选中仅关闭面板」预览模式，**零警告零抛错**；正常接入环境行为不变（选中即发送）。
- **`ChatroomLiveFullscreenEffect` 新增 `fullscreen?: boolean` prop**（缺省 true 向后兼容）：
  false 时动效改为铺满**最近定位祖先**（absolute + inset 0），
  服务嵌套容器 / 文档演示等需要把动效约束在局部区域的场景。

### 兼容性

- 自 0.3.0 起无公开 API 破坏性变更；`layout` 缺省 `fullscreen`、`popupMode` 缺省 `auto`、
  新增 prop / 插槽全部可选；版本号与根 CHANGELOG 同步（`changelog:check` 通过）。

---

## @easemob/uikit-chatroom 0.3.0 (2026-08-15)

### 新增

- **插槽 / props 可控性补全（P6，消费者视角反向评估，详见 docs/CHATROOM-CAPABILITY-REVIEW.md）**：
  - **隐藏 / 接管 header**：scene `features.header?: boolean`（缺省 true 向后兼容）——`header: false`
    隐藏内置 `ChatroomHeader`；`#header` 插槽提供时仍渲染（容器内接管）；完全无头时业务自绘
    头部放容器外。demo 基础聊天室 / 语聊房 / 小班课三页改用 `features.header: false`，
    消除「DemoSceneHeader + 容器内置 header」双层重合；
  - **弹幕流自定义插槽**（`ChatroomLiveDanmakuStream`）：新增 `#prefix`（scope `{ item,
    display-name }`，渲染在整条气泡最左端——左侧头像/等级/VIP 皇冠栏位直插位）、`#badge`
    （scope `{ item, display-name }`，渲染在用户名后、内容前——VIP 徽章/等级/勋章直插位）、
    `#item`（scope `{ item, display-name, display-count }`，整条覆盖内置气泡渲染，
    合并/挤出/动画仍由组件管理）、`#empty`（空态覆盖）；
    `LiveDanmakuKind` 加宽 `| (string & {})`（业务自定义 kind 类型安全透传）；`LiveDanmakuItem`
    新增 `zone?: 'notice' | 'chat'`（条目级分区覆盖，优先于 NOTIFICATION_KINDS/CHAT_KINDS 常量）
    与 `meta?: Record<string, unknown>`（业务数据透传）；`isNotificationKind`/`isChatKind`
    参数加宽为 `string`；自定义 kind 优先级回落 0（防永不被挤出）；
  - **容器插槽补全**：`#message-list`（scope `{ messages, status, history-has-more,
    loading-history, load-more }`，整块替换「加载更多 + VirtualList + 空态」，滚动/加载职责
    转移业务；提供后 message-item/message-custom/empty 自然失效）、`#terminal`（被踢/解散终态
    视图覆盖）、`#announcement-editor`（公告编辑弹窗覆盖，scope `{ show, content, save, close }`）；
  - **`ChatroomLiveTopBar` 新增 `#extra` 插槽**（more/report 之后，业务注入分享/关注/在线数等）。
- **文档**：docs `chatroom-container` 页重写（真实 props/emits/19 插槽全表 + 隐藏/重写 header
  三种形态示例 + `#message-list` 容器内弹幕示例）；新增「直播弹幕流 DanmakuStream」组件页
  （props/插槽/自定义 kind 指南/CSS token 清单）；sidebar 登记。
- **Demo**：live 页弹幕流新增 `#prefix`（左侧 👑 皇冠）、`#badge`（👑L 徽章，读
  `item.meta.vipLevel`）与 `#item`（整条自定义渲染）开关演示；`ChatroomLiveTopBar` 注入分享
  按钮示范 `#extra`；基础聊天室页新增 `#toolbar` 消息区形态切换 + `#message-list` 弹幕流接管演示。
- 类型导出：`LiveDanmakuZone` 加入公开类型面。

### 兼容性

- 全部新增项可选、默认行为不变：`features.header` 缺省 true、弹幕未提供插槽时内置渲染不变、
  容器未提供新插槽时行为与 0.2.0 一致；既有五变种 demo 页零回归。

---

## @easemob/uikit-chatroom 0.2.0 (2026-08-15)

### 新增

- **PC 模式与角色能力（P5 增量，设计文档 §11）**——角色不内置，UIKit 权限面天花板 =
  SDK 原生权限（owner/admin/member/none），业务角色由应用层抽象：
  - **权限原语上提**：`useChatroomMember.canManageMember(target)`——「当前用户能否管理
    目标成员」判定（不能管房主/自己、admin 只能由 owner 管理）从成员面板内嵌上提为公开
    API，成员面板改复用（单一实现）；
  - **split 分栏布局实现**（scene `layout: 'fullscreen' | 'split' | 'auto'`，`fullscreen`
    缺省向后兼容；auto 按视口 <768px 选择）：新 `ChatroomSplitLayout`（三栏
    [舞台 `#stage` | 消息主栏 | 成员侧栏]，成员栏可拖拽 200~480px）+ 容器 split 分支
    （`#stage` 插槽、成员侧栏、窄视口退化 H5 弹层）；
  - **管理位**：容器新 `manage-actions` 插槽（`canManage` 门控，业务注入操作台入口）+
    scene `features.management` 开关组（mute/kick/muteAll/announcement/blocklist/admin）；
  - **PC 交互**：新 `ChatroomContextMenu`（右键/点击菜单：视口翻转/外部点击/Esc 关闭）、
    新 `ChatroomMemberSidebar`（成员/黑名单 tab + 分页 + 行悬停快捷操作 + 右键菜单 +
    危险操作居中确认）、成员项 `#manage-actions` 悬停插槽（`@media (hover:hover)` 包裹）、
    `popupMode` 弹层退化（成员/礼物/表情面板宽视口 sheet→dialog，`useChatroomPopupMode`）、
    输入条多行（textarea + Shift+Enter 换行，scene `features.multilineInput`）、
    Esc 关闭弹层（scene `features.keyboard`）；
  - **新 composables**：`useChatroomLayout`（布局解析）、`useChatroomPopupMode`（弹层形态）；
  - **Demo 验收**：`apps/demo-chatroom` 新增 `src/demo-role.ts`（业务角色抽象参考实现：
    主播=owner / 场控=admin / 观众=member；老师=owner / 学生=member）+ 宽屏路由
    `#/pc-live`（开播端三栏 + 管理位 + 信令房双房商品链路）与 `#/pc-class`（双端角色
    切换），PC 路由不套 375px 手机壳（全窗口渲染）；
  - **文档**：docs「权限模型与业务角色」页（权限矩阵 + 角色抽象指南 + 名单存房间属性建议）、
    quickstart PC 接入段、PC 组件页；设计文档 §11「PC 模式与角色边界」决策落盘。

### 变更

- `ChatroomMemberItem` manage 事件携带点击事件（`(member, event)`，供 PC 菜单定位；
  组件为模块内部实现，不对外导出，事件签名变更无外部影响）；
- `ChatroomMemberPanel` / `ChatroomGiftBar` / `ChatroomInputBar` 新增 `popupMode` prop
  （缺省 sheet，行为不变）。

---

## @easemob/uikit-chatroom 0.1.0 (2026-08-15)

### 新增

- **聊天室场景包（P2 完整落地：P2-1 无头内核 + P2-2 容器/UI/demo）**：
  - sdk 层：`Chatroom` / `ChatroomMember` / `ChatroomMuteItem` / `ChatroomAnnouncement` / `ChatroomAttributes` domain 类型；`ChatroomAdapter` 薄封装 websdk `ChatRoomManager` 全量能力（进退房/成员分页/管理员/禁言（含全员）/黑/白名单/公告/房间属性 KV/房间信息）+ `ChatManager` 聊天室消息收发与历史拉取
  - 事件层：`registerChatroomEventHandlers` 注册 `chatRoomManager` 全量房间事件（成员进出/禁言/管理员/公告/属性/被踢/解散等）+ `chatManager` 消息事件（按 `conversationType === 'chatRoom'` 过滤，与单群聊互不污染），房间事件转系统通知插入消息流（复用 core notice 工具）
  - store：**按「房间注册表 `Map<roomId, RoomState>` + `activeRoomId` 活动视图」两层建模**（设计文档 §5.9，单房为其特例，P3 多房间/信令房零返工）：房间状态机（idle/joining/joined/leaving/kicked/destroyed，joinToken + roomId 双重防竞态）+ 消息流**按 roomId 分桶**（无未读/无会话/无回执；渲染列表默认封顶 200 条可配 + 接收缓冲队列按 150ms 窗口批量合并）
  - composables：`useChatroom`（join/leave/断线重连自动重进 + 进房「最近 N 条」提示）/ `useChatroomMessage`（按房发送：`sendText(text, { roomId })` 支持显式指定房间，P3 信令房契约就绪）/ `useChatroomMember`（按角色权限位）/ `useChatroomAttributes`（四层同步 + 场景前缀约定）/ `useChatroomScene`（场景预设机制与类型，内置 preset P3 落地）/ `useChatroomProvider`（不新增 Provider 概念，组合 core `useCoreUIKitProvider` + 场景 manager 注入 `[ChatManager, ChatRoomManager, UserInfoManager]`，**显式 `enableUserInfoSync: false`**——未注入 GroupManager，避免 SDK 能力校验抛错）
  - **`EmChatroomContainer` 容器（P2-2）**：三步接入（Provider + 容器 + room-id），props（room-id / scene / auto-join / history-page-size / max-messages）+ emits（back / kicked / destroyed / join-error）+ 命名插槽（header / header-title / header-extra / toolbar / message-item / message-custom / member-item / member-panel / empty / notice / input-bar）；只消费公开 composable 契约（防「第二 API 面」，headless 契约 P3 验收同内核）；场景 features 控制公告条/成员面板显隐
  - modules/chatroom：消息项（文本/图片/custom 兜底/系统通知/撤回标记）、输入条（文本+图片，发送即清空 + 列表内失败反馈）、成员面板（底部 Popup + 分页加载 + 禁言/踢人/管理员操作菜单）、成员项（角色徽章/禁言标记）、顶部栏（返回/人数/退出）、公告条；H5-first 样式（全屏 flex + 安全区）
  - demo 验证页：`apps/demo` hash 路由 `#/chatroom` 独立页，嵌套在 IM Provider 内**验证两包同装**；输入房间 ID 三步接入跑通（历史拉取/消息收发/成员面板/系统通知）
  - `chatroom.*` locale keys（zh-CN/en）经 core `mergeLocaleMessages` 并入；resolver/auto-imports（`EasemobUIKitChatroomResolver` / `EasemobUIKitChatroomImports`）经共享 `gen-aux-entries.mjs` 参数化生成
- **两包同装硬性验收项落地（TECH-DEBT D97）**：
  - core `sdk/client.ts` 新增 **SDK 单例配置对齐**：首次 init 的规范化配置为基准，后续 init（另一场景包）自动对齐（appKey 冲突抛错、其余字段以首次为准 + 告警、managers 追加注册不受影响）——IM + chatroom 同装不再触发 `ChatClient already initialized with different config`；
  - uikit-im `chat-events.ts` `onMessage` / `onMessageRecalled` 忽略 `conversationType === 'chatRoom'` 消息（聊天室广播不流入 IM 会话/消息 store）。
- **版本同步工具升级**：`changelog:check` 扩展为多包版本段校验——裸格式段归入 uikit-im 历史段，新段统一 `@easemob/<pkg>` 前缀；逐包校验最新段一致、段内无重复且 semver 降序。
