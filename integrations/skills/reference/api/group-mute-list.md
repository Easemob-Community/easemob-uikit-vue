<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupMuteList API

### Props

| 属性         | 类型                             | 默认值    | 说明                                                 |
| --- | --- | --- | --- |
| groupId    | `string`                       | —      | —                                                  |
| showHeader | `boolean`                      | `true` | 是否显示顶部计数操作栏，默认 true；会话详情抽屉分栏页传 false（tabs 页不显示计数栏） |
| border     | `boolean \| 'top' \| 'bottom'` | —      | 行分隔线（透传 EmCell border 能力），默认无；会话详情抽屉分栏页传 'bottom'  |

### Events

| 事件名      | 参数                       | 说明 |
| --- | --- | --- |
| `unmute` | member: UiGroupMember    | —  |
| `mute`   | members: UiGroupMember[] | —  |
