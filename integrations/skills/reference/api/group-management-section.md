<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupManagementSection API

### Props

| 属性               | 类型                    | 默认值        | 说明                               |
| --- | --- | --- | --- |
| groupId          | `string`              | —          | 群 ID                             |
| displayMode      | `'drawer' \| 'modal'` | `'drawer'` | 二级页面展示方式：drawer（抽屉）或 modal（居中弹窗） |
| showMuteAll      | `boolean`             | `true`     | 是否展示全员禁言开关                       |
| showMuteList     | `boolean`             | `true`     | 是否展示禁言列表入口                       |
| showBlocklist    | `boolean`             | `true`     | 是否展示黑名单入口                        |
| showAllowlist    | `boolean`             | `false`    | 是否展示白名单入口                        |
| showSharedFiles  | `boolean`             | `true`     | 是否展示共享文件入口                       |
| showJoinRequests | `boolean`             | `false`    | 是否展示入群申请入口                       |

### Events

| 事件名               | 参数                                                            | 说明 |
| --- | --- | --- |
| `group-operation` | `payload: { type: string, groupId: string, userId?: string }` | —  |

### Slots

| 插槽名             | 说明 |
| --- | --- |
| `mute-list`     | —  |
| `block-list`    | —  |
| `allow-list`    | —  |
| `shared-files`  | —  |
| `join-requests` | —  |
