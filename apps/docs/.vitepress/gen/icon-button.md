<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## IconButton API

### Props

| 属性       | 类型                                                             | 默认值         | 说明                                      |
| --- | --- | --- | --- |
| icon     | `string`                                                       | —           | 图标名称，格式 "category/icon-name"            |
| iconSize | `number`                                                       | `undefined` | —                                       |
| type     | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 按钮语义类型                                  |
| variant  | `'solid' \| 'outline' \| 'ghost'`                              | `'ghost'`   | 视觉变体：solid 实心填充 / outline 描边 / ghost 透明 |
| size     | `'small' \| 'medium'`                                          | `'medium'`  | —                                       |
| disabled | `boolean`                                                      | `false`     | —                                       |
| title    | `string`                                                       | —           | hover/tooltip 提示                        |

### Events

| 事件名     | 参数                | 说明 |
| --- | --- | --- |
| `click` | event: MouseEvent | —  |
