<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupBlocklist API

### Props

| 属性      | 类型                             | 默认值 | 说明                                                |
| --- | --- | --- | --- |
| groupId | `string`                       | —   | —                                                 |
| border  | `boolean \| 'top' \| 'bottom'` | —   | 行分隔线（透传 EmCell border 能力），默认无；会话详情抽屉分栏页传 'bottom' |

### Events

| 事件名       | 参数                       | 说明 |
| --- | --- | --- |
| `unblock` | member: UiGroupMember    | —  |
| `block`   | members: UiGroupMember[] | —  |
