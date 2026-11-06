<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## MultiBodyMessage API

### Props

| 属性      | 类型          | 默认值 | 说明 |
| --- | --- | --- | --- |
| message | `UiMessage` | —   | —  |

### Events

| 事件名                     | 参数                                               | 说明 |
| --- | --- | --- |
| `mention-click`         | userId: string                                   | —  |
| `location-click`        | body: LocationMessageBody, message: UiMessage    | —  |
| `custom-message-action` | action: string, payload: any, message: UiMessage | —  |
