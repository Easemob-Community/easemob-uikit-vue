<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveTopBar API

### Props

| 属性        | 类型       | 默认值  | 说明                 |
| --- | --- | --- | --- |
| title     | `string` | `''` | 直播间标题（如「会员年中福利」）   |
| avatarUrl | `string` | `''` | 主播头像（缺省用 emoji 占位） |
| heat      | `string` | `''` | 热度展示文本（如「1.4万」）    |

### Events

| 事件名      | 参数 | 说明   |
| --- | --- | --- |
| `more`   | —  | 更多按钮 |
| `report` | —  | 投诉按钮 |

### Slots

| 插槽名     | 说明 |
| --- | --- |
| `extra` | —  |
