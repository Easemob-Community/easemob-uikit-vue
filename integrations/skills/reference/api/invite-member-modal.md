<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## InviteMemberModal API

### Props

| 属性                | 类型         | 默认值 | 说明                 |
| --- | --- | --- | --- |
| show              | `boolean`  | —   | —                  |
| groupId           | `string`   | —   | —                  |
| existingMemberIds | `string[]` | —   | 已加入群的用户 ID 列表，用于禁用 |

### Events

| 事件名           | 参数                | 说明 |
| --- | --- | --- |
| `update:show` | value: boolean    | —  |
| `invited`     | userIds: string[] | —  |
