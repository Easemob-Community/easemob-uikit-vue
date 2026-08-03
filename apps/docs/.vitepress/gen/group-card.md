<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupCard API

### Props

| 属性       | 类型                   | 默认值        | 说明                  |
| --- | --- | --- | --- |
| groupId  | `string`             | —          | 群 ID                |
| name     | `string`             | —          | 群名称                 |
| avatar   | `string`             | —          | 群头像 URL             |
| banner   | `string`             | —          | 顶部背景图 URL，不传时使用默认渐变 |
| actions  | `GroupCardAction[]`  | `() => []` | 底部操作按钮              |
| infoRows | `GroupCardInfoRow[]` | `() => []` | 信息行                 |

### Events

| 事件名            | 参数          | 说明 |
| --- | --- | --- |
| `action-click` | key: string | —  |

### Slots

| 插槽名    | 说明 |
| --- | --- |
| `name` | —  |
