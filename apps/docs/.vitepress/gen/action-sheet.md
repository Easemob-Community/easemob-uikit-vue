<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ActionSheet API

### Props

| 属性         | 类型                  | 默认值                        | 说明 |
| show       | `boolean`           | —                          | —  |
| title      | `string`            | `''`                       | —  |
| actions    | `ActionSheetItem[]` | —                          | —  |
| cancelText | `string`            | `t('button.cancel', '取消')` | —  |

### Events

| 事件名           | 参数                                   | 说明 |
| `update:show` | value: boolean                       | —  |
| `select`      | item: ActionSheetItem, index: number | —  |
| `cancel`      | —                                    | —  |
