<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatContainer API

### Props

| 属性      | 类型                       | 默认值 | 说明                                              |
| --- | --- | --- | --- |
| config  | `ChatConfig`             | —   | 聊天容器完整配置（输入框 / 消息列表 / 消息操作 / 群能力等，见 ChatConfig） |
| loading | `boolean`                | —   | 是否处于全局加载状态                                      |
| class   | `string`                 | —   | 自定义根元素 class                                    |
| style   | `Record<string, string>` | —   | 自定义根元素 style                                    |

#### config {#config}

> 聊天页面全局配置

| 属性                      | 类型                                                                                           | 默认值 | 说明                                      |
| --- | --- | --- | --- |
| enableDraft             | `boolean`                                                                                    | —   | 是否启用草稿功能（切换会话时自动保存/恢复输入内容），默认 true      |
| hooks                   | `ChatSendHooks`                                                                              | —   | 消息发送拦截钩子                                |
| header                  | <a class="config-ref" href="#config-header"><strong>Header 配置</strong></a>                   | —   | Header 配置                               |
| drawer                  | <a class="config-ref" href="#config-drawer"><strong>抽屉配置 / Drawer configuration</strong></a> | —   | 抽屉配置 / Drawer configuration             |
| messageList             | <a class="config-ref" href="#config-messagelist"><strong>消息列表配置</strong></a>                 | —   | 消息列表配置                                  |
| messageAction           | <a class="config-ref" href="#config-messageaction"><strong>消息操作配置</strong></a>               | —   | 消息操作配置                                  |
| groupReadReceipt        | <a class="config-ref" href="#config-groupreadreceipt"><strong>群已读回执配置</strong></a>           | —   | 群已读回执配置                                 |
| groupMember             | <a class="config-ref" href="#config-groupmember"><strong>群成员列表配置</strong></a>                | —   | 群成员列表配置                                 |
| groupManagement         | <a class="config-ref" href="#config-groupmanagement"><strong>群管理功能配置</strong></a>            | —   | 群管理功能配置                                 |
| input                   | <a class="config-ref" href="#config-input"><strong>输入框配置</strong></a>                        | —   | 输入框配置                                   |
| lastMessageTextResolver | `LastMessageTextResolver`                                                                    | —   | 会话列表最新一条消息文案解析器；custom 消息等场景可由业务自定义预览内容 |
| textMessage             | <a class="config-ref" href="#config-textmessage"><strong>文本消息配置</strong></a>                 | —   | 文本消息配置                                  |

#### config.hooks {#config-hooks}

> 消息发送拦截钩子

| 属性         | 类型                                                             | 默认值 | 说明                   |
| --- | --- | --- | --- |
| beforeSend | `(message: Partial<UiMessage>) => boolean \| Promise<boolean>` | —   | 发送前拦截，返回 false 则阻止发送 |
| afterSend  | `(message: UiMessage) => void`                                 | —   | 发送成功后的回调             |

#### config.header {#config-header}

> Header 配置

| 属性              | 类型                                         | 默认值 | 说明                                                                                                                                                                                                                                                                                                                        |
| --- | --- | --- | --- |
| visible         | `boolean`                                  | —   | 是否显示 header，默认 true                                                                                                                                                                                                                                                                                                       |
| align           | `HeaderAlign`                              | —   | 标题对齐方式，默认 'center'；对单聊/群聊同时生效                                                                                                                                                                                                                                                                                             |
| showAvatar      | `boolean`                                  | —   | 是否显示头像，默认 false                                                                                                                                                                                                                                                                                                           |
| showMemberCount | `boolean`                                  | —   | 是否显示群成员数后缀，默认 true；仅群聊生效                                                                                                                                                                                                                                                                                                  |
| showDrawerEntry | `boolean`                                  | —   | 是否显示抽屉入口按钮（聊天信息），默认 true                                                                                                                                                                                                                                                                                                  |
| clickOpenDrawer | `boolean`                                  | —   | 点击 header（标题/副标题区域）是否展开会话详情抽屉，默认 true；<br>头像（名片弹窗）与右侧按钮（搜索/抽屉入口）的点击不受影响。<br>Whether clicking the header (title/subtitle area) opens the conversation-details<br>drawer. Default true. Avatar (profile card) and action buttons are not affected.                                                                          |
| showSearchEntry | `boolean`                                  | —   | 是否显示 header 搜索消息按钮，默认 false（搜索入口归口会话详情抽屉的 Message Search 行；<br>仅在 messageList.search.enabled 为 true 时生效，开启后 header 恢复显示搜索按钮）。<br>Whether to show the message-search button in the header. Default false — the search entry<br>lives in the conversation-details drawer; takes effect only when message search is enabled. |
| subtitle        | `'auto' \| 'presence' \| 'sign' \| 'none'` | —   | 单聊副标题档位（标题下方区域），默认 'auto'；仅单聊生效：<br>auto（在线状态 + 个性签名，缺哪个显示哪个）/ presence（仅在线状态）/ sign（仅签名）/<br>none（整个副标题区连同「正在输入」提示一起关闭）。<br>对方正在输入时优先占据此区域；可被 #header-subtitle 插槽整体接管。<br>Subtitle level under the title for single chats. Default 'auto'.                                                                               |

#### config.drawer {#config-drawer}

> 抽屉配置 / Drawer configuration

| 属性                     | 类型                    | 默认值 | 说明                                                                                                                                                                                                                                                                                                                                                       |
| --- | --- | --- | --- |
| mode                   | `'overlay' \| 'push'` | —   | 展示模式，默认 'push'：'push' 占位挤压聊天区，抽屉以独立平面区域参与布局<br>（圆角跟随 --uikit-components-radius）；'overlay' 完全遮挡聊天区。<br>移动端（viewport &lt; 768）两种模式一律回落为满铺全屏（独立页面观感）。<br>Display mode. Default 'push' (takes layout space and squeezes the chat area as an<br>independent flat region); 'overlay' covers the chat area. On mobile (&lt;768px) both fall back to fullscreen. |
| width                  | `number`              | —   | 抽屉宽度（px），默认 320；push 与 overlay 模式均生效，全屏模式忽略 / Drawer width in px. Default 320; ignored in fullscreen                                                                                                                                                                                                                                                     |
| closeOnClickOutside    | `boolean`             | —   | 是否点击抽屉外部（聊天区 / 其他空白处）自动关闭，默认 true；仅 push 模式生效<br>（overlay 模式由遮罩点击关闭，语义归口 closeOnClickOverlay），全屏模式忽略。<br>Whether clicking outside the drawer (chat area / blank areas) closes it. Default true;<br>only applies in 'push' mode (overlay mode closes via the mask click), ignored in fullscreen.                                                          |
| avatarClickViewProfile | `boolean`             | —   | 抽屉预览区点击头像是否打开用户名片（单聊对方头像 / 群聊成员宫格头像），默认 true；<br>关闭后群聊宫格头像点击回落为「查看全部成员」。<br>Whether clicking an avatar in the drawer preview area (peer avatar in single chats,<br>member grid avatars in group chats) opens the user profile card. Default true;<br>when false, group grid avatar clicks fall back to "view all members".                               |

#### config.messageList {#config-messagelist}

> 消息列表配置

| 属性                     | 类型                                                                                                              | 默认值 | 说明                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | --- | --- | --- |
| layout                 | `MessageLayout`                                                                                                 | —   | 消息布局模式，默认 'conversation'                                                                                                                                                                                                                                                                                                                                                                 |
| showAvatar             | `boolean`                                                                                                       | —   | 是否显示头像（自己与对方的统一开关），默认 true                                                                                                                                                                                                                                                                                                                                                               |
| showSelfAvatar         | `boolean`                                                                                                       | —   | 是否显示「自己」的头像，默认 true；仅在 showAvatar 为 true 时生效。<br>设为 false 可隐藏自己的头像而对方头像照常显示（微信/QQ 式「隐藏我的头像」）。                                                                                                                                                                                                                                                                                            |
| showTime               | `TimeDisplayStrategy`                                                                                           | —   | 时间显示策略，默认 false（不显示），可设置为 true / 'always' / 'hover'                                                                                                                                                                                                                                                                                                                                      |
| bubbleShape            | `BubbleShape`                                                                                                   | —   | 气泡形状（圆角档位：'round' = 16px / 'square' = 8px），默认 'round' / Bubble corner preset, default 'round' (16px); 'square' is 8px                                                                                                                                                                                                                                                                    |
| bubbleStyle            | `'filled' \| 'plain'`                                                                                           | —   | 中性气泡（对方）样式：'filled' 带底色（默认）/ 'plain' 无底色纯文字。<br>Neutral bubble (peer side) style: 'filled' with background (default) or 'plain' text-only without background.                                                                                                                                                                                                                            |
| voiceUnreadDot         | `boolean`                                                                                                       | —   | 对方语音消息未播放红点：默认 true（本会话实时收到的语音未点击时，气泡外侧垂直居中显示红点，点击后隐藏；<br>历史/漫游消息无播放状态，永不显示，刷新页面即复位）。<br>单条消息级覆盖：在消息项插槽（如 #message-voice）内对 INJECTION_KEY.VOICE_UNREAD_DOT 深一层 provide。<br>Whether to show an unread red dot on peer voice messages (default true; runtime-only, resets on refresh).<br>Per-message override: provide INJECTION_KEY.VOICE_UNREAD_DOT one level deeper inside item slots. |
| avatarSize             | `number`                                                                                                        | —   | 头像尺寸（px），默认 36                                                                                                                                                                                                                                                                                                                                                                           |
| presence               | `boolean`                                                                                                       | —   | 消息头像在线状态点：默认 false（不展示；微信/QQ 式消息流头像不带状态点）。<br>开启后仅对方头像展示状态点，且需 Provider 全局 enablePresence 链路可用。<br>Whether to show presence dots on message avatars. Default false; only peer<br>avatars show the dot, gated by the global enablePresence feature.                                                                                                                                       |
| avatarClickViewProfile | `boolean`                                                                                                       | —   | 左键点击消息头像是否打开用户名片，默认 true；右键菜单（查看资料/@提及）不受此开关影响                                                                                                                                                                                                                                                                                                                                           |
| messageGap             | `number`                                                                                                        | —   | 消息项之间的间距（px），默认 12                                                                                                                                                                                                                                                                                                                                                                       |
| messagePadding         | `number`                                                                                                        | —   | 消息列表内边距（px），默认 16                                                                                                                                                                                                                                                                                                                                                                        |
| groupInterval          | `number`                                                                                                        | —   | 时间分组间隔（毫秒），默认 5 分钟                                                                                                                                                                                                                                                                                                                                                                       |
| virtualScrollThreshold | `number`                                                                                                        | —   | 虚拟滚动阈值，超过该消息数启用虚拟滚动，默认 100                                                                                                                                                                                                                                                                                                                                                               |
| loadHistory            | <a class="config-ref" href="#config-messagelist-loadhistory"><strong>加载历史消息配置</strong></a>                      | —   | 加载历史消息配置                                                                                                                                                                                                                                                                                                                                                                                 |
| maxMessageCount        | `number`                                                                                                        | —   | 单个会话最大消息存储数，超出时从旧消息开始裁剪，默认 300                                                                                                                                                                                                                                                                                                                                                           |
| pinnedBar              | <a class="config-ref" href="#config-messagelist-pinnedbar"><strong>置顶横幅配置</strong></a>                          | —   | 置顶横幅配置                                                                                                                                                                                                                                                                                                                                                                                   |
| search                 | <a class="config-ref" href="#config-messagelist-search"><strong>消息搜索配置（居中 Modal 形态，支持关键词高亮与消息类型筛选）</strong></a> | —   | 消息搜索配置（居中 Modal 形态，支持关键词高亮与消息类型筛选）                                                                                                                                                                                                                                                                                                                                                       |
| autoLocateAtMe         | `boolean`                                                                                                       | —   | 切换会话时是否自动定位到首条@我的消息，默认 true                                                                                                                                                                                                                                                                                                                                                              |
| messageStatus          | `MessageStatusConfig`                                                                                           | —   | 消息发送状态展示配置                                                                                                                                                                                                                                                                                                                                                                               |
| quote                  | <a class="config-ref" href="#config-messagelist-quote"><strong>引用展示配置</strong></a>                              | —   | 引用展示配置                                                                                                                                                                                                                                                                                                                                                                                   |

#### config.messageList.loadHistory {#config-messagelist-loadhistory}

> 加载历史消息配置

| 属性     | 类型                | 默认值 | 说明                     |
| --- | --- | --- | --- |
| enable | `boolean`         | —   | 是否启用历史消息加载，默认 true     |
| mode   | `LoadHistoryMode` | —   | 加载模式，默认 'auto'（自动适配端型） |

#### config.messageList.pinnedBar {#config-messagelist-pinnedbar}

> 置顶横幅配置

| 属性               | 类型        | 默认值 | 说明                |
| --- | --- | --- | --- |
| visible          | `boolean` | —   | 是否显示顶部置顶条，默认 true |
| maxPreviewLength | `number`  | —   | 预览文本最大长度，默认 30    |

#### config.messageList.search {#config-messagelist-search}

> 消息搜索配置（居中 Modal 形态，支持关键词高亮与消息类型筛选）

| 属性                 | 类型        | 默认值 | 说明                                                                                  |
| --- | --- | --- | --- |
| enabled            | `boolean` | —   | 是否启用消息搜索入口，默认 false                                                                 |
| enableServerSearch | `boolean` | —   | 是否启用 SDK 服务端消息搜索（websdk2 searchMessages），默认 false（仅搜索本地已加载消息）；开启后出现「当前会话/全部会话」作用域切换 |
| pageSize           | `number`  | —   | 每页条数，默认 20                                                                          |

#### config.messageList.messageStatus {#config-messagelist-messagestatus}

> 消息状态展示配置

| 属性              | 类型                                            | 默认值 | 说明                                                                                                                                                                                                      |
| --- | --- | --- | --- |
| showText        | `boolean`                                     | —   | 是否显示状态文本，默认 false（仅展示 icon）                                                                                                                                                                             |
| textMap         | `Partial<Record<MessageStatusValue, string>>` | —   | 状态文本映射，未指定时从 locale 读取默认文案                                                                                                                                                                              |
| iconMap         | `Partial<Record<MessageStatusValue, string>>` | —   | 状态图标映射，未指定时使用默认图标                                                                                                                                                                                       |
| direction       | `'horizontal' \| 'vertical'`                  | —   | 文本与图标的排列方向，默认 'horizontal'                                                                                                                                                                              |
| position        | `'below' \| 'inline'`                         | —   | 状态相对消息气泡的位置，默认 'inline'（气泡末尾、与气泡底部对齐）；'below' 为气泡下方 / Position relative to the bubble, default 'inline' (at bubble end, bottom-aligned)                                                                 |
| style           | `MessageStatusStyle`                          | —   | 消息状态图标风格。<br>- classic（默认）：沿用 check / doneAll 经典双勾映射；<br>- capsule：数字胶囊风格，未读=空心圆/实心圆点，已读=圆+对勾。                                                                                                          |
| readIconDisplay | `'latest' \| 'all'`                           | —   | 单聊己方「已读」状态图标的展示策略，默认 'latest'；仅单聊生效。<br>- latest：连续已读只在最新一条已读消息上展示已读 icon（仿抖音移动端）；<br>- all：每条已读消息都展示已读 icon。<br>Display strategy for the read icon on self messages in single chats. Default 'latest'. |

#### config.messageList.quote {#config-messagelist-quote}

> 引用展示配置

| 属性         | 类型        | 默认值 | 说明                                                                                                      |
| --- | --- | --- | --- |
| showAvatar | `boolean` | —   | 引用卡片是否展示原消息发送人头像，默认 false。<br>Whether the quote card shows the original sender's avatar. Default false. |

#### config.messageAction {#config-messageaction}

> 消息操作配置

| 属性                    | 类型                    | 默认值 | 说明                                                                                                                    |
| --- | --- | --- | --- |
| enableQuote           | `boolean`             | —   | 启用引用，默认 true                                                                                                          |
| enableCopy            | `boolean`             | —   | 启用复制，默认 true（仅文本消息生效）                                                                                                 |
| enableDownload        | `boolean`             | —   | 启用下载，默认 true（仅文件消息生效）                                                                                                 |
| enableDelete          | `boolean`             | —   | 启用删除，默认 true                                                                                                          |
| enableRecall          | `boolean`             | —   | 启用撤回，默认 true                                                                                                          |
| enableRecallOther     | `boolean`             | —   | 启用撤回他人消息，默认 true（仅群主/管理员在群聊中生效）                                                                                       |
| enableEdit            | `boolean`             | —   | 启用编辑，默认 true（仅 isSelf 且文本消息生效）                                                                                        |
| enableForward         | `boolean`             | —   | 启用转发，默认 true                                                                                                          |
| enableMultiSelect     | `boolean`             | —   | 启用多选，默认 true                                                                                                          |
| enableTranslate       | `boolean`             | —   | 启用翻译，默认 true（仅文本消息生效）                                                                                                 |
| enableVoiceToText     | `boolean`             | —   | 启用语音转文字，默认 true（仅带 url 的语音消息生效）                                                                                       |
| enablePin             | `boolean`             | —   | 启用置顶/取消置顶，默认 true                                                                                                     |
| recallDisableDuration | `number`              | —   | 撤回禁用时长（毫秒），超过该时长后无法撤回，默认 2 分钟（120000）                                                                                 |
| translateTargetLang   | `string`              | —   | 翻译目标语言，例如 'zh-Hans'、'en'。不设置时根据 UIKIT 当前 locale 自动选择（zh-CN→zh-Hans，en→en，其他默认 en）                                     |
| gridActionTypes       | `MessageActionType[]` | —   | H5 长按操作面板（ActionSheet）的高频操作集合：命中的操作类型收拢到顶部图标网格区，<br>其余保持整行列表；默认 ['quote', 'copy', 'forward', 'download']。传 [] 关闭网格分区。 |

#### config.groupReadReceipt {#config-groupreadreceipt}

> 群已读回执配置

| 属性           | 类型        | 默认值 | 说明                        |
| --- | --- | --- | --- |
| enabled      | `boolean` | —   | 是否启用群已读回执，默认 false        |
| maxGroupSize | `number`  | —   | 群人数上限，默认 200（超过此人数不发已读回执） |

#### config.groupMember {#config-groupmember}

> 群成员列表配置

| 属性        | 类型                             | 默认值 | 说明                   |
| --- | --- | --- | --- |
| allowChat | `'all' \| 'contact' \| 'none'` | —   | 是否允许对成员发起单聊，默认 'all' |

#### config.groupManagement {#config-groupmanagement}

> 群管理功能配置

| 属性               | 类型                    | 默认值 | 说明                                         |
| --- | --- | --- | --- |
| displayMode      | `'drawer' \| 'modal'` | —   | 二级页面展示方式：drawer（抽屉）或 modal（居中弹窗），默认 drawer |
| showMuteAll      | `boolean`             | —   | 是否展示全员禁言开关，默认 true                         |
| showMuteList     | `boolean`             | —   | 是否展示禁言列表入口，默认 true                         |
| showBlocklist    | `boolean`             | —   | 是否展示黑名单入口，默认 true                          |
| showAllowlist    | `boolean`             | —   | 是否展示白名单入口，默认 true                          |
| showSharedFiles  | `boolean`             | —   | 是否展示共享文件入口，默认 true                         |
| showJoinRequests | `boolean`             | —   | 是否展示入群申请入口，默认 true                         |

#### config.input {#config-input}

> 输入框配置

| 属性                | 类型                                                                                                     | 默认值 | 说明                                                                                                                                                                                                                                              |
| --- | --- | --- | --- |
| mode              | `InputMode`                                                                                            | —   | 输入框模式，默认 'simple'                                                                                                                                                                                                                               |
| style             | `InputStyle`                                                                                           | —   | 输入框工具栏位置，默认 'toolbar-top'（工具栏在上、输入框在下）；'toolbar-bottom' 为工具栏在下、输入框在上                                                                                                                                                                            |
| features          | <a class="config-ref" href="#config-input-features"><strong>功能开关</strong></a>                          | —   | 功能开关                                                                                                                                                                                                                                            |
| autoFocus         | `boolean`                                                                                              | —   | 是否自动聚焦输入框，默认 false                                                                                                                                                                                                                              |
| focusBorderColor  | `string`                                                                                               | —   | 聚焦边框色。默认保持容器边框色（聚焦高亮由主色 20% 外环 --uikit-input-focus-ring 承担）；显式传入时聚焦态边框改用该色                                                                                                                                                                      |
| caretColor        | `string`                                                                                               | —   | 光标颜色，不设置则跟随主题色（--uikit-primary） / Caret color, defaults to the theme primary color                                                                                                                                                              |
| selectionColor    | `string`                                                                                               | —   | 文本选中背景色，不设置则使用主题选中色（--uikit-selection-bg，跟随主题色）                                                                                                                                                                                                 |
| maxLength         | `number`                                                                                               | —   | 最大输入长度，0 或不设置表示无限制                                                                                                                                                                                                                              |
| mention           | <a class="config-ref" href="#config-input-mention"><strong>提及配置（@）</strong></a>                        | —   | 提及配置（@）                                                                                                                                                                                                                                         |
| enableTyping      | `boolean`                                                                                              | —   | 是否启用输入状态提示（对方正在输入...），默认 true                                                                                                                                                                                                                   |
| showSendButton    | `boolean`                                                                                              | —   | 是否显示发送按钮。显式 true/false 优先；未配置（undefined）时按端型取默认：<br>PC 隐藏（回车发送，对齐桌面 IM 形态），移动端显示（触屏无回车键）。<br>Whether to show the send button. Explicit true/false wins; when unset,<br>defaults by device type — hidden on PC (Enter to send), shown on mobile. |
| resizable         | `boolean`                                                                                              | —   | 是否允许拖拽调整输入区高度（仅 PC，手柄在输入卡片上缘；simple 模式默认高 132px），默认 true / Whether the input area height can be resized by dragging (PC only), default true                                                                                                     |
| expandable        | `boolean`                                                                                              | —   | 是否显示「展开输入框」角标（仅 PC，卡片右上角；点击后输入区升至 212px，再次点击或 Esc 恢复默认；拖拽超过 212px 时角标自动呈现恢复态），默认 true / Whether to show the expand-input corner toggle (PC only), default true                                                                                  |
| pasteImagePreview | `boolean`                                                                                              | —   | 粘贴剪贴板图片时是否弹出预览确认弹窗（截图/复制的图片预览后发送；simple 模式 PC 生效），默认 true；关闭后粘贴图片不弹窗也不发送 / Whether pasting an image from the clipboard opens a preview-confirm modal before sending (simple mode on PC), default true; when false, pasted images are discarded  |
| stickerPacks      | `EmojiStickerPack[]`                                                                                   | —   | 表情包（sticker/GIF）配置，默认 [] 不展示表情包 tab；以图片消息发送并打 ext.isSticker 标记，按表情渲染、不启用图片预览 / Sticker packs shown as extra tabs in the emoji picker                                                                                                            |
| emoji             | <a class="config-ref" href="#config-input-emoji"><strong>Emoji 面板配置 / Emoji picker config</strong></a> | —   | Emoji 面板配置 / Emoji picker config                                                                                                                                                                                                                |

#### config.input.features {#config-input-features}

> 功能开关

| 属性          | 类型        | 默认值 | 说明                                                                                                                                                                                                |
| --- | --- | --- | --- |
| emoji       | `boolean` | —   | Emoji，默认 true                                                                                                                                                                                     |
| image       | `boolean` | —   | 图片，默认 true                                                                                                                                                                                        |
| file        | `boolean` | —   | 文件，默认 true                                                                                                                                                                                        |
| voice       | `boolean` | —   | 语音，默认 true                                                                                                                                                                                        |
| video       | `boolean` | —   | 视频，默认 true                                                                                                                                                                                        |
| translation | `boolean` | —   | 翻译入口，默认 false；仅渲染按钮，点击经 `translation-click` 事件交由宿主接入 / Translation entry, default false; only renders the button, click is surfaced via the `translation-click` event for the host to handle      |
| contactCard | `boolean` | —   | 名片发送入口，默认 false；仅渲染按钮，点击经 `contact-card-click` 事件交由宿主接入 / Contact card entry, default false; only renders the button, click is surfaced via the `contact-card-click` event for the host to handle |
| mention     | `boolean` | —   | 提及功能（@），默认 true                                                                                                                                                                                   |

#### config.input.mention {#config-input-mention}

> 提及配置（@）

| 属性          | 类型                 | 默认值 | 说明                               |
| --- | --- | --- | --- |
| contacts    | `MentionContact[]` | —   | 联系人列表（也可从外部通过 chat-container 灌入） |
| onlyInGroup | `boolean`          | —   | 是否仅在群聊中启用，默认 true                |

#### config.input.emoji {#config-input-emoji}

> Emoji 面板配置 / Emoji picker config

| 属性           | 类型                  | 默认值 | 说明                                                                                                                                     |
| --- | --- | --- | --- |
| recent       | `boolean`           | —   | 是否启用「常用」最近使用区（置于表情视图顶部），默认 true；关闭后不展示常用区也不再记录 / Whether to enable the recent-emoji section at the top of the emoji view, default true |
| recentCount  | `number`            | —   | 常用列表长度（保留最近使用个数），默认 5 / Number of recently-used emojis kept, default 5                                                                 |
| tabsPosition | `EmojiTabsPosition` | —   | tab 位置：顶部/底部/左侧/右侧，默认 'bottom' / Tabs position: top/bottom/left/right, default 'bottom'                                                |
| stickerHover | `boolean`           | —   | sticker 悬停时切换展示 gif（需提供 thumbUrl 预览图），默认 true / Swap to the gif on hover when thumbUrl is present, default true                        |
| emojiIcon    | `string`            | —   | 「Emoji」视图 tab 预览小图 URL（可选，展示图片而非文字）/ Optional icon for the "Emoji" view tab, shown as an image preview instead of text                 |

#### config.textMessage {#config-textmessage}

> 文本消息配置

| 属性                     | 类型                                           | 默认值 | 说明                                                                                                                                                                                                                                                                                                                                       |
| --- | --- | --- | --- |
| enableLinkify          | `boolean`                                    | —   | 是否启用 URL 识别为可点击链接，默认 true                                                                                                                                                                                                                                                                                                                |
| onLinkClick            | `(url: string) => boolean \| string \| void` | —   | 链接点击拦截器<br>- 返回 false：阻止跳转<br>- 返回 string：跳转到返回值指定的地址<br>- 返回 void / undefined / true：默认行为（跳转原始 URL）                                                                                                                                                                                                                                     |
| enableMentionHighlight | `boolean`                                    | —   | 是否启用 @提及高亮识别，默认 true                                                                                                                                                                                                                                                                                                                     |
| onMentionClick         | `(userId: string) => void`                   | —   | 提及点击回调（@）                                                                                                                                                                                                                                                                                                                                |
| locateOnMentionClick   | `boolean`                                    | —   | 点击消息中的 @名字时，是否在消息列表内滚动定位到该用户最近一条消息（默认 true）。<br>仅当未配置 onMentionClick 时生效；定位同时仍会对外触发 at-me-click 事件。<br>/ Whether clicking an @mention scrolls to and highlights the mentioned user's latest message in the list (default true).<br>Only applies when onMentionClick is not configured; the at-me-click event is still emitted alongside. |

### Events

| 事件名                     | 参数                                                            | 说明                                                                                                                                                                                                                                                  |
| --- | --- | --- |
| `recall-failed`         | error: any, message: UiMessage                                | 消息撤回失败时触发，参数为错误对象与目标消息 / Emitted when recalling a message fails, with the error and the target message                                                                                                                                              |
| `at-me-click`           | userId: string                                                | 点击消息中的 @提及（@mention）时触发，参数为被提及的用户 ID / Emitted when an @mention in a message is clicked, with the mentioned user ID                                                                                                                                 |
| `group-operation`       | `payload: { type: string, groupId: string, userId?: string }` | 群管理操作（全员禁言、成员禁言/拉黑、入群申请处理等）时触发，参数为操作类型、群 ID，成员类操作附带 userId / Emitted when a group management action is performed, with the action type, group ID and optional user ID                                                                               |
| `location-click`        | body: LocationMessageBody, message: UiMessage                 | 点击位置（location）消息时触发，参数为位置消息体与对应消息 / Emitted when a location message is clicked, with the location body and the message                                                                                                                              |
| `custom-message-action` | action: string, payload: any, message: UiMessage              | 点击自定义消息（custom）上的操作按钮时触发，参数为操作标识、载荷与对应消息 / Emitted when an action button on a custom message is clicked, with the action key, payload and the message                                                                                               |
| `translation-click`     | —                                                             | 点击输入框工具栏翻译按钮时触发（需在 config.input.features.translation 开启后展示，翻译业务交由宿主接入） / Emitted when the translation button in the input toolbar is clicked (shown when config.input.features.translation is enabled; translation logic is left to the host)       |
| `contact-card-click`    | —                                                             | 点击输入框工具栏名片按钮时触发（需在 config.input.features.contactCard 开启后展示，名片发送业务交由宿主接入） / Emitted when the contact card button in the input toolbar is clicked (shown when config.input.features.contactCard is enabled; contact card sending is left to the host) |

### Slots

| 插槽名                | 说明 |
| --- | --- |
| `loading`          | —  |
| `error`            | —  |
| `empty`            | —  |
| `header`           | —  |
| `header-avatar`    | —  |
| `header-title`     | —  |
| `header-subtitle`  | —  |
| `header-extra`     | —  |
| `notice`           | —  |
| `watermark`        | —  |
| `multi-select-bar` | —  |
| `toolbar-extra`    | —  |
| `input-panel`      | —  |
| `drawer`           | —  |
| `message-search`   | —  |
| `invite-member`    | —  |
| `forward`          | —  |
| `user-card`        | —  |
| `group-card`       | —  |
