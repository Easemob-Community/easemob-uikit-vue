<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatInfoDrawer API

### Props

| 属性                         | 类型                             | 默认值        | 说明                                                                                                                         |
| --- | --- | --- | --- |
| show                       | `boolean`                      | —          | —                                                                                                                          |
| conversation               | `Conversation \| null`         | —          | —                                                                                                                          |
| isGroup                    | `boolean`                      | —          | —                                                                                                                          |
| offsetTop                  | `string \| number`             | —          | —                                                                                                                          |
| groupManagementDisplayMode | `'drawer' \| 'modal'`          | `'drawer'` | 群管理二级页面展示方式：drawer（抽屉）或 modal（居中弹窗）。                                                                                       |
| allowChat                  | `'all' \| 'contact' \| 'none'` | `'all'`    | 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许                                                                            |
| showMuteAll                | `boolean`                      | `true`     | 是否展示全员禁言开关                                                                                                                 |
| showMuteList               | `boolean`                      | `true`     | 是否展示禁言列表入口                                                                                                                 |
| showBlocklist              | `boolean`                      | `true`     | 是否展示黑名单入口                                                                                                                  |
| showAllowlist              | `boolean`                      | `false`    | 是否展示白名单入口                                                                                                                  |
| showSharedFiles            | `boolean`                      | `true`     | 是否展示共享文件入口                                                                                                                 |
| showJoinRequests           | `boolean`                      | `false`    | 是否展示入群申请入口                                                                                                                 |
| mode                       | `'overlay' \| 'push'`          | `'push'`   | 抽屉展示模式：push 占位挤压聊天区（默认）/ overlay 完全遮挡                                                                                      |
| closeOnClickOutside        | `boolean`                      | `true`     | 点击抽屉外部（聊天区 / 空白处）是否关闭，默认 true；透传 ChatDrawer 的 closeOnClickOutside，仅 push 模式生效                                              |
| fullscreen                 | `boolean`                      | `false`    | 全屏模式（移动端独立页面）：满铺聊天容器、圆角归零，header 主档显示返回箭头                                                                                  |
| width                      | `number`                       | —          | 抽屉宽度（px），默认 320；全屏模式忽略                                                                                                     |
| showMessageSearch          | `boolean`                      | —          | 是否展示「消息搜索」入口行（由宿主按 messageList.search 配置下发）                                                                                |
| avatarClickViewProfile     | `boolean`                      | `true`     | 预览区点击头像是否打开用户名片（单聊对方头像 / 群聊成员宫格头像），默认 true；<br>由宿主按 ChatConfig.drawer.avatarClickViewProfile 下发；名片弹层由宿主经 view-profile 事件接管 |

### Events

| 事件名               | 参数                                                                                                            | 说明                                                                    |
| --- | --- | --- |
| `update:show`     | value: boolean                                                                                                | —                                                                     |
| `leave-group`     | groupId: string                                                                                               | —                                                                     |
| `destroy-group`   | groupId: string                                                                                               | —                                                                     |
| `clear-history`   | `payload: { id: string, type: ConversationTypeValue, deleteConversation?: boolean, deleteRoaming?: boolean }` | —                                                                     |
| `add-member`      | groupId: string                                                                                               | —                                                                     |
| `group-operation` | `payload: { type: string, groupId: string, userId?: string }`                                                 | —                                                                     |
| `chat-member`     | member: UiGroupMember                                                                                         | —                                                                     |
| `remove-member`   | member: UiGroupMember                                                                                         | —                                                                     |
| `set-admin`       | member: UiGroupMember                                                                                         | —                                                                     |
| `remove-admin`    | member: UiGroupMember                                                                                         | —                                                                     |
| `block-changed`   | userId: string, blocked: boolean                                                                              | 单聊拉黑/取消拉黑状态变更。<br>默认 UI 已按新设计稿移除拉黑入口；保留事件声明供 drawer-actions 等插槽接管时触发。 |
| `search-message`  | —                                                                                                             | 打开消息搜索（由宿主 chat 容器接管搜索弹窗）                                             |
| `create-group`    | userId: string                                                                                                | 单聊「添加」：以对方为初始成员发起群聊                                                   |
| `view-profile`    | userId: string, anchor: HTMLElement                                                                           | 预览区头像点击：查看用户名片（由宿主 chat 容器接管名片弹窗，anchor 为头像所在元素）                      |

### Slots

| 插槽名                    | 说明 |
| --- | --- |
| `drawer-header`        | —  |
| `drawer-members`       | —  |
| `drawer-settings`      | —  |
| `drawer-actions`       | —  |
| `drawer-member-detail` | —  |
| `drawer-footer`        | —  |
