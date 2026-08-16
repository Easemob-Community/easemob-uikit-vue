<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveOverlayManager API

### Props

| 属性    | 类型                  | 默认值 | 说明           |
| --- | --- | --- | --- |
| items | `LiveOverlayItem[]` | —   | overlay 条目列表 |

### Events

| 事件名      | 参数                   | 说明                     |
| --- | --- | --- |
| `remove` | id: string \| number | 业务方移除某条 overlay（如点击关闭） |

### Slots

| 插槽名    | 说明 |
| --- | --- |
| `item` | —  |
