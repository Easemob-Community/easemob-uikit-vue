<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupMemberList API

### Props

| 属性               | 类型                             | 默认值        | 说明                                                                                                                                                                                                        |
| --- | --- | --- | --- |
| groupId          | `string`                       | —          | —                                                                                                                                                                                                         |
| group            | `UiGroup \| null`              | `null`     | —                                                                                                                                                                                                         |
| members          | `UiGroupMember[]`              | `() => []` | —                                                                                                                                                                                                         |
| loading          | `boolean`                      | `false`    | —                                                                                                                                                                                                         |
| hasMore          | `boolean`                      | `false`    | —                                                                                                                                                                                                         |
| currentUserId    | `string`                       | `''`       | —                                                                                                                                                                                                         |
| showSearch       | `boolean`                      | `true`     | —                                                                                                                                                                                                         |
| closable         | `boolean`                      | `false`    | 是否在标题栏显示关闭按钮                                                                                                                                                                                              |
| showHeader       | `boolean`                      | `true`     | 是否展示头部标题栏                                                                                                                                                                                                 |
| allowChat        | `'all' \| 'contact' \| 'none'` | `'all'`    | 是否允许对成员发起单聊：'all' 所有人，'contact' 仅联系人，'none' 不允许                                                                                                                                                           |
| showMuteAction   | `boolean`                      | `true`     | 是否展示禁言/取消禁言操作                                                                                                                                                                                             |
| showBlockAction  | `boolean`                      | `true`     | 是否展示拉黑/取消拉黑操作                                                                                                                                                                                             |
| showAdminAction  | `boolean`                      | `true`     | 是否展示设/取消管理员操作                                                                                                                                                                                             |
| showRemoveAction | `boolean`                      | `true`     | 是否展示移除成员操作                                                                                                                                                                                                |
| showChatAction   | `boolean`                      | `true`     | 是否展示发消息操作                                                                                                                                                                                                 |
| showId           | `boolean`                      | `true`     | 成员行是否显示第二行 ID，默认 true；会话详情抽屉成员页传 false（设计稿无 ID 行）                                                                                                                                                         |
| showNoMore       | `boolean`                      | `true`     | 列表末尾是否显示「没有更多了」，默认 true；会话详情抽屉成员页传 false（设计稿无结尾文字）                                                                                                                                                        |
| border           | `boolean \| 'top' \| 'bottom'` | —          | 成员行分隔线（透传 EmCell border 能力），默认无；会话详情抽屉成员页传 'bottom'                                                                                                                                                       |
| menuWithIcon     | `boolean`                      | —          | ⋮ 菜单项是否显示图标，默认 false（设计稿菜单为纯文字项）                                                                                                                                                                          |
| searchPill       | `boolean`                      | —          | 搜索框是否使用椭圆（pill）形态，默认 false；会话详情抽屉成员页传 true                                                                                                                                                                |
| enablePresence   | `boolean`                      | —          | 是否展示成员头像在线状态，默认跟随 Provider 全局 enablePresence 配置；<br>可视区懒查询策略仍由全局 fetchGroupMemberPresenceOnVisible 控制。<br>Whether to show presence dots on member avatars. Defaults to the global enablePresence feature. |
| keyword          | `string`                       | —          | 受控搜索关键词：传入时优先于内部搜索框输入（会话详情抽屉成员页的共享搜索框走该入口），<br>此时通常配合 show-search=false 隐藏自带搜索框                                                                                                                           |

### Events

| 事件名              | 参数                    | 说明 |
| --- | --- | --- |
| `click-member`   | member: UiGroupMember | —  |
| `chat-member`    | member: UiGroupMember | —  |
| `remove-member`  | member: UiGroupMember | —  |
| `set-admin`      | member: UiGroupMember | —  |
| `remove-admin`   | member: UiGroupMember | —  |
| `mute-member`    | member: UiGroupMember | —  |
| `unmute-member`  | member: UiGroupMember | —  |
| `block-member`   | member: UiGroupMember | —  |
| `unblock-member` | member: UiGroupMember | —  |
| `transfer-owner` | member: UiGroupMember | —  |
| `load-more`      | —                     | —  |
| `close`          | —                     | —  |

### Slots

| 插槽名           | 说明 |
| --- | --- |
| `member-menu` | —  |
