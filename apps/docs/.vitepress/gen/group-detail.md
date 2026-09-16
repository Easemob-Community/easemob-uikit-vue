<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupDetail API

### Props

| 属性      | 类型                | 默认值    | 说明                     |
| --- | --- | --- | --- |
| groupId | `string`          | —      | 群 ID                   |
| group   | `UiGroup \| null` | `null` | 外部已缓存的群摘要（可选，用于首屏快速展示） |

### Events

| 事件名            | 参数              | 说明                          |
| --- | --- | --- |
| `send-message` | groupId: string | —                           |
| `leaved`       | groupId: string | 退出群聊成功后触发（组件内部已删除对应会话与消息缓存） |
| `destroyed`    | groupId: string | 解散群聊成功后触发（组件内部已删除对应会话与消息缓存） |

### Slots

| 插槽名       | 说明 |
| --- | --- |
| `avatar`  | —  |
| `header`  | —  |
| `extra`   | —  |
| `actions` | —  |
| `footer`  | —  |
