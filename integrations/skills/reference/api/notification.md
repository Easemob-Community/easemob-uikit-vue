<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Notification API

### Props

| 属性   | 类型                 | 默认值 | 说明     |
| --- | --- | --- | --- |
| item | `NotificationItem` | —   | 通知条目数据 |

### Events

| 事件名     | 参数                     | 说明                          |
| --- | --- | --- |
| `close` | id: string             | 点击关闭按钮时触发（已阻止冒泡），负载为通知条目 id |
| `click` | item: NotificationItem | 点击通知卡片时触发，负载为完整通知条目数据       |
