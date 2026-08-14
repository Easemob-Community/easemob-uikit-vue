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

| 属性                      | 类型                                                                                 | 默认值 | 说明                                      |
| --- | --- | --- | --- |
| enableDraft             | `boolean`                                                                          | —   | 是否启用草稿功能（切换会话时自动保存/恢复输入内容），默认 true      |
| hooks                   | `ChatSendHooks`                                                                    | —   | 消息发送拦截钩子                                |
| header                  | <a class="config-ref" href="#config-header"><strong>Header 配置</strong></a>         | —   | Header 配置                               |
| messageList             | <a class="config-ref" href="#config-messagelist"><strong>消息列表配置</strong></a>       | —   | 消息列表配置                                  |
| messageAction           | <a class="config-ref" href="#config-messageaction"><strong>消息操作配置</strong></a>     | —   | 消息操作配置                                  |
| groupReadReceipt        | <a class="config-ref" href="#config-groupreadreceipt"><strong>群已读回执配置</strong></a> | —   | 群已读回执配置                                 |
| groupMember             | <a class="config-ref" href="#config-groupmember"><strong>群成员列表配置</strong></a>      | —   | 群成员列表配置                                 |
| groupManagement         | <a class="config-ref" href="#config-groupmanagement"><strong>群管理功能配置</strong></a>  | —   | 群管理功能配置                                 |
| input                   | <a class="config-ref" href="#config-input"><strong>输入框配置</strong></a>              | —   | 输入框配置                                   |
| lastMessageTextResolver | `LastMessageTextResolver`                                                          | —   | 会话列表最新一条消息文案解析器；custom 消息等场景可由业务自定义预览内容 |
| textMessage             | <a class="config-ref" href="#config-textmessage"><strong>文本消息配置</strong></a>       | —   | 文本消息配置                                  |

#### config.hooks {#config-hooks}

> 消息发送拦截钩子

| 属性         | 类型                                                             | 默认值 | 说明                   |
| --- | --- | --- | --- |
| beforeSend | `(message: Partial<UiMessage>) => boolean \| Promise<boolean>` | —   | 发送前拦截，返回 false 则阻止发送 |
| afterSend  | `(message: UiMessage) => void`                                 | —   | 发送成功后的回调             |

#### config.header {#config-header}

> Header 配置

| 属性              | 类型            | 默认值 | 说明                            |
| --- | --- | --- | --- |
| visible         | `boolean`     | —   | 是否显示 header，默认 true           |
| align           | `HeaderAlign` | —   | 标题对齐方式，默认 'center'；对单聊/群聊同时生效 |
| customSlot      | `boolean`     | —   | 是否启用自定义插槽，默认 false            |
| showAvatar      | `boolean`     | —   | 是否显示头像，默认 false               |
| showMemberCount | `boolean`     | —   | 是否显示群成员数后缀，默认 true；仅群聊生效      |

#### config.messageList {#config-messagelist}

> 消息列表配置

| 属性                     | 类型                                                                                         | 默认值 | 说明                                                  |
| --- | --- | --- | --- |
| layout                 | `MessageLayout`                                                                            | —   | 消息布局模式，默认 'conversation'                            |
| showAvatar             | `boolean`                                                                                  | —   | 是否显示头像，默认 true                                      |
| showTime               | `TimeDisplayStrategy`                                                                      | —   | 时间显示策略，默认 false（不显示），可设置为 true / 'always' / 'hover' |
| bubbleShape            | `BubbleShape`                                                                              | —   | 气泡形状，默认 'round'                                     |
| avatarSize             | `number`                                                                                   | —   | 头像尺寸（px），默认 36                                      |
| messageGap             | `number`                                                                                   | —   | 消息项之间的间距（px），默认 12                                  |
| messagePadding         | `number`                                                                                   | —   | 消息列表内边距（px），默认 16                                   |
| groupInterval          | `number`                                                                                   | —   | 时间分组间隔（毫秒），默认 5 分钟                                  |
| virtualScrollThreshold | `number`                                                                                   | —   | 虚拟滚动阈值，超过该消息数启用虚拟滚动，默认 100                          |
| loadHistory            | <a class="config-ref" href="#config-messagelist-loadhistory"><strong>加载历史消息配置</strong></a> | —   | 加载历史消息配置                                            |
| maxMessageCount        | `number`                                                                                   | —   | 单个会话最大消息存储数，超出时从旧消息开始裁剪，默认 300                      |
| pinnedBar              | <a class="config-ref" href="#config-messagelist-pinnedbar"><strong>置顶横幅配置</strong></a>     | —   | 置顶横幅配置                                              |
| search                 | <a class="config-ref" href="#config-messagelist-search"><strong>消息搜索配置</strong></a>        | —   | 消息搜索配置                                              |
| autoLocateAtMe         | `boolean`                                                                                  | —   | 切换会话时是否自动定位到首条@我的消息，默认 true                         |
| messageStatus          | `MessageStatusConfig`                                                                      | —   | 消息发送状态展示配置                                          |

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

> 消息搜索配置

| 属性                 | 类型        | 默认值 | 说明                                    |
| --- | --- | --- | --- |
| enabled            | `boolean` | —   | 是否启用消息搜索入口，默认 false                   |
| enableServerSearch | `boolean` | —   | 是否启用 SDK 服务端消息搜索，默认 false（仅搜索本地已加载消息） |
| pageSize           | `number`  | —   | 每页条数，默认 20                            |

#### config.messageList.messageStatus {#config-messagelist-messagestatus}

> 消息状态展示配置

| 属性        | 类型                                            | 默认值 | 说明                                                                                             |
| --- | --- | --- | --- |
| showText  | `boolean`                                     | —   | 是否显示状态文本，默认 false（仅展示 icon）                                                                    |
| textMap   | `Partial<Record<MessageStatusValue, string>>` | —   | 状态文本映射，未指定时从 locale 读取默认文案                                                                     |
| iconMap   | `Partial<Record<MessageStatusValue, string>>` | —   | 状态图标映射，未指定时使用默认图标                                                                              |
| direction | `'horizontal' \| 'vertical'`                  | —   | 文本与图标的排列方向，默认 'horizontal'                                                                     |
| position  | `'below' \| 'inline'`                         | —   | 状态相对消息气泡的位置，默认 'below'（气泡下方）/ Position relative to the bubble                                  |
| style     | `MessageStatusStyle`                          | —   | 消息状态图标风格。<br>- classic（默认）：沿用 check / doneAll 经典双勾映射；<br>- capsule：数字胶囊风格，未读=空心圆/实心圆点，已读=圆+对勾。 |

#### config.messageAction {#config-messageaction}

> 消息操作配置

| 属性                    | 类型        | 默认值 | 说明                                                                                |
| --- | --- | --- | --- |
| enableQuote           | `boolean` | —   | 启用引用，默认 true                                                                      |
| enableCopy            | `boolean` | —   | 启用复制，默认 true（仅文本消息生效）                                                             |
| enableDownload        | `boolean` | —   | 启用下载，默认 true（仅文件消息生效）                                                             |
| enableDelete          | `boolean` | —   | 启用删除，默认 true                                                                      |
| enableRecall          | `boolean` | —   | 启用撤回，默认 true                                                                      |
| enableRecallOther     | `boolean` | —   | 启用撤回他人消息，默认 true（仅群主/管理员在群聊中生效）                                                   |
| enableEdit            | `boolean` | —   | 启用编辑，默认 true（仅 isSelf 且文本消息生效）                                                    |
| enableForward         | `boolean` | —   | 启用转发，默认 true                                                                      |
| enableMultiSelect     | `boolean` | —   | 启用多选，默认 true                                                                      |
| enableTranslate       | `boolean` | —   | 启用翻译，默认 true（仅文本消息生效）                                                             |
| enableVoiceToText     | `boolean` | —   | 启用语音转文字，默认 true（仅带 url 的语音消息生效）                                                   |
| enablePin             | `boolean` | —   | 启用置顶/取消置顶，默认 true                                                                 |
| recallDisableDuration | `number`  | —   | 撤回禁用时长（毫秒），超过该时长后无法撤回，默认 2 分钟（120000）                                             |
| translateTargetLang   | `string`  | —   | 翻译目标语言，例如 'zh-Hans'、'en'。不设置时根据 UIKIT 当前 locale 自动选择（zh-CN→zh-Hans，en→en，其他默认 en） |

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

| 属性               | 类型                                                                              | 默认值 | 说明                                                                                                                          |
| --- | --- | --- | --- |
| mode             | `InputMode`                                                                     | —   | 输入框模式，默认 'simple'                                                                                                           |
| style            | `InputStyle`                                                                    | —   | 输入框风格，默认 'wechat'                                                                                                           |
| features         | <a class="config-ref" href="#config-input-features"><strong>功能开关</strong></a>   | —   | 功能开关                                                                                                                        |
| autoFocus        | `boolean`                                                                       | —   | 是否自动聚焦输入框，默认 false                                                                                                          |
| focusBorderColor | `string`                                                                        | —   | 聚焦时边框颜色，不设置则使用默认主题色                                                                                                         |
| caretColor       | `string`                                                                        | —   | 光标颜色，不设置则使用默认                                                                                                               |
| selectionColor   | `string`                                                                        | —   | 文本选中背景色，不设置则使用主题选中色（--uikit-selection-bg，跟随主题色）                                                                             |
| maxLength        | `number`                                                                        | —   | 最大输入长度，0 或不设置表示无限制                                                                                                          |
| mention          | <a class="config-ref" href="#config-input-mention"><strong>提及配置（@）</strong></a> | —   | 提及配置（@）                                                                                                                     |
| enableTyping     | `boolean`                                                                       | —   | 是否启用输入状态提示（对方正在输入...），默认 true                                                                                               |
| showSendButton   | `boolean`                                                                       | —   | 是否显示发送按钮，默认 true                                                                                                            |
| resizable        | `boolean`                                                                       | —   | 是否允许拖拽调整输入区高度（仅 PC），默认 true / Whether the input area height can be resized by dragging (PC only), default true              |
| expandable       | `boolean`                                                                       | —   | 是否显示「展开输入框」按钮（仅 PC，点击后输入区原地撑高，Esc 或再次点击收起），默认 true / Whether to show the expand-input toggle button (PC only), default true |
| stickerPacks     | `EmojiStickerPack[]`                                                            | —   | 表情包（sticker/GIF）配置，默认 [] 不展示表情包 tab / Sticker packs shown as extra tabs in the emoji picker                                 |

#### config.input.features {#config-input-features}

> 功能开关

| 属性      | 类型        | 默认值 | 说明              |
| --- | --- | --- | --- |
| emoji   | `boolean` | —   | Emoji，默认 true   |
| image   | `boolean` | —   | 图片，默认 true      |
| file    | `boolean` | —   | 文件，默认 true      |
| voice   | `boolean` | —   | 语音，默认 true      |
| video   | `boolean` | —   | 视频，默认 true      |
| mention | `boolean` | —   | 提及功能（@），默认 true |

#### config.input.mention {#config-input-mention}

> 提及配置（@）

| 属性          | 类型                 | 默认值 | 说明                               |
| --- | --- | --- | --- |
| contacts    | `MentionContact[]` | —   | 联系人列表（也可从外部通过 chat-container 灌入） |
| onlyInGroup | `boolean`          | —   | 是否仅在群聊中启用，默认 true                |

#### config.textMessage {#config-textmessage}

> 文本消息配置

| 属性                     | 类型                                           | 默认值 | 说明                                                                                                   |
| --- | --- | --- | --- |
| enableLinkify          | `boolean`                                    | —   | 是否启用 URL 识别为可点击链接，默认 true                                                                            |
| onLinkClick            | `(url: string) => boolean \| string \| void` | —   | 链接点击拦截器<br>- 返回 false：阻止跳转<br>- 返回 string：跳转到返回值指定的地址<br>- 返回 void / undefined / true：默认行为（跳转原始 URL） |
| enableMentionHighlight | `boolean`                                    | —   | 是否启用                                                                                                 |
| onMentionClick         | `(userId: string) => void`                   | —   | 提及点击回调（@）                                                                                            |

### Events

| 事件名                     | 参数                                                            | 说明                                                                                                                                                                    |
| --- | --- | --- |
| `recall-failed`         | error: any, message: UiMessage                                | 消息撤回失败时触发，参数为错误对象与目标消息 / Emitted when recalling a message fails, with the error and the target message                                                                |
| `at-me-click`           | userId: string                                                | 点击消息中的                                                                                                                                                                |
| `group-operation`       | `payload: { type: string, groupId: string, userId?: string }` | 群管理操作（全员禁言、成员禁言/拉黑、入群申请处理等）时触发，参数为操作类型、群 ID，成员类操作附带 userId / Emitted when a group management action is performed, with the action type, group ID and optional user ID |
| `location-click`        | body: LocationMessageBody, message: UiMessage                 | 点击位置（location）消息时触发，参数为位置消息体与对应消息 / Emitted when a location message is clicked, with the location body and the message                                                |
| `custom-message-action` | action: string, payload: any, message: UiMessage              | 点击自定义消息（custom）上的操作按钮时触发，参数为操作标识、载荷与对应消息 / Emitted when an action button on a custom message is clicked, with the action key, payload and the message                 |

### Slots

| 插槽名             | 说明 |
| --- | --- |
| `loading`       | —  |
| `error`         | —  |
| `empty`         | —  |
| `header`        | —  |
| `header-avatar` | —  |
| `header-title`  | —  |
| `header-extra`  | —  |
| `toolbar-extra` | —  |
| `input-panel`   | —  |
