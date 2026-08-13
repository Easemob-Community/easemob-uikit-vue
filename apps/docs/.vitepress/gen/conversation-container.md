<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ConversationContainer API

### Props

| 属性               | 类型                                                 | 默认值                                    | 说明                                                                                        |
| --- | --- | --- | --- |
| showSearch       | `boolean`                                          | `true`                                 | —                                                                                         |
| customActions    | `ConversationAction[]`                             | `() => []`                             | —                                                                                         |
| showScrollToTop  | `boolean`                                          | `true`                                 | —                                                                                         |
| timeFormatter    | `(timestamp: number) => string`                    | —                                      | —                                                                                         |
| messageFormatter | `(msg: string, type?: string) => string`           | —                                      | —                                                                                         |
| showSenderName   | `boolean`                                          | `true`                                 | —                                                                                         |
| emptyText        | `string`                                           | —                                      | —                                                                                         |
| unreadMode       | `'count' \| 'dot'`                                 | `'count'`                              | —                                                                                         |
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

| 事件名                  | 参数                                      | 说明                         |
| --- | --- | --- |
| `select`             | id: string, conversation: Conversation  | —                          |
| `conversation-click` | id: string, conversation: Conversation  | —                          |
| `at-me-click`        | id: string, conversation: Conversation  | —                          |
| `custom-action`      | key: string, conversation: Conversation | —                          |
| `update:active-tab`  | tab: ConversationTabKey                 | —                          |
| `reconnect`          | —                                       | 断网/连接失败横幅被点击时触发，由业务方决定重连策略 |

### Slots

| 插槽名             | 说明 |
| --- | --- |
| `header`        | —  |
| `tabs`          | —  |
| `status-banner` | —  |
| `body`          | —  |
| `empty`         | —  |
| `footer`        | —  |
