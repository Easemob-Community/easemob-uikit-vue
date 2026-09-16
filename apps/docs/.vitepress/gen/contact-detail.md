<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ContactDetail API

### Props

| 属性      | 类型                  | 默认值    | 说明                       |
| --- | --- | --- | --- |
| userId  | `string`            | —      | 联系人用户 ID                 |
| contact | `UiContact \| null` | `null` | 外部已缓存的联系人摘要（可选，用于首屏快速展示） |

### Events

| 事件名              | 参数                               | 说明 |
| --- | --- | --- |
| `send-message`   | userId: string                   | —  |
| `deleted`        | userId: string                   | —  |
| `block-changed`  | userId: string, blocked: boolean | —  |
| `remark-changed` | userId: string, remark: string   | —  |

### Slots

| 插槽名       | 说明 |
| --- | --- |
| `avatar`  | —  |
| `header`  | —  |
| `alias`   | —  |
| `extra`   | —  |
| `actions` | —  |
| `footer`  | —  |
