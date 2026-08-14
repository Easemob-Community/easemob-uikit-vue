<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ConversationContainer API

### Props

| 属性               | 类型                                                 | 默认值                                    | 说明                                                                                        |
| --- | --- | --- | --- |
| showSearch       | `boolean`                                          | `true`                                 | 是否展示搜索框，默认 true                                                                           |
| customActions    | `ConversationAction[]`                             | `() => []`                             | 自定义操作项列表，追加到会话项右键菜单/H5 长按 ActionSheet；未提供 handler 的项点击后触发 custom-action 事件                |
| showScrollToTop  | `boolean`                                          | `true`                                 | 是否展示滚动置顶按钮，默认 true                                                                        |
| timeFormatter    | `(timestamp: number) => string`                    | —                                      | 时间格式化函数，入参为毫秒时间戳（ms），返回展示文本；不传时按当前 locale 用 toLocaleTimeString 兜底                         |
| messageFormatter | `(msg: string, type?: string) => string`           | —                                      | 消息摘要格式化函数，入参为原始摘要文本与消息类型（当前实现固定传入 'text'），返回展示文本；不传时原样展示                                  |
| showSenderName   | `boolean`                                          | `true`                                 | 群聊会话摘要是否显示发送者名称前缀，默认 true                                                                 |
| emptyText        | `string`                                           | —                                      | 空列表提示文案，优先于各分栏 tab 的默认空状态文案                                                               |
| unreadMode       | `'count' \| 'dot'`                                 | `'count'`                              | 未读数量展示模式：count 显示数字，dot 仅显示红点，默认 'count'                                                  |
| showHeader       | `boolean`                                          | `true`                                 | 是否展示头部区域，默认 true                                                                          |
| title            | `string`                                           | —                                      | Header 标题文本，不传则使用 i18n 默认值                                                                |
| headerAlign      | `'left' \| 'center' \| 'right'`                    | `'left'`                               | Header 内容对齐方式：left \| center \| right，默认 left                                             |
| filterFn         | `(keyword: string, item: Conversation) => boolean` | —                                      | 自定义搜索过滤函数                                                                                 |
| bodySticky       | `boolean`                                          | `false`                                | #body slot 是否固定不随列表滚动，默认 false                                                            |
| footerSticky     | `boolean`                                          | `false`                                | #footer slot 是否固定不随列表滚动，默认 false                                                          |
| pullRefresh      | `boolean`                                          | `false`                                | 是否启用下拉刷新（H5），默认 false                                                                     |
| enablePresence   | `boolean`                                          | —                                      | 是否展示单聊头像在线状态；不传则使用 Provider 全局 enablePresence 配置                                          |
| tabs             | `ConversationTabKey[]`                             | `() => [...DEFAULT_CONVERSATION_TABS]` | 会话分栏 tab 集合，默认全量 ['all', 'unread', 'atMe', 'single', 'group']；<br>顺序即渲染优先级；传空数组可隐藏 tab 栏。 |
| activeTab        | `ConversationTabKey`                               | `'all'`                                | 当前激活的分栏 tab（v-model:active-tab），默认 'all'                                                  |
| showStatusBanner | `boolean`                                          | `true`                                 | 是否展示连接/同步状态横幅，默认 true                                                                     |

### Events

| 事件名                  | 参数                                      | 说明                                                 |
| --- | --- | --- |
| `select`             | id: string, conversation: Conversation  | 会话选中完成（已切换会话、发送已读回执、加载草稿等内部逻辑之后）时触发，负载为会话 id 与会话对象 |
| `conversation-click` | id: string, conversation: Conversation  | 点击会话项时立即触发（先于内部选中逻辑，供 H5 页面栈导航等使用），负载为会话 id 与会话对象  |
| `at-me-click`        | id: string, conversation: Conversation  | 点击带未清除                                             |
| `custom-action`      | key: string, conversation: Conversation | 自定义操作项未提供 handler 时向上触发，负载为操作 key 与会话对象            |
| `update:active-tab`  | tab: ConversationTabKey                 | 切换分栏 tab 时触发（v-model:active-tab），负载为新的 tab key     |
| `reconnect`          | —                                       | 断网/连接失败横幅被点击时触发，由业务方决定重连策略                         |

### Slots

| 插槽名             | 说明 |
| --- | --- |
| `header`        | —  |
| `tabs`          | —  |
| `status-banner` | —  |
| `body`          | —  |
| `empty`         | —  |
| `footer`        | —  |
