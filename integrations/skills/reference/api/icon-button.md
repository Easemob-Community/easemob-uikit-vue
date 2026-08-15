<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## IconButton API

### Props

| 属性       | 类型                                                             | 默认值         | 说明                                                                  |
| --- | --- | --- | --- |
| icon     | `string`                                                       | —           | 图标名称，格式 "category/icon-name"                                        |
| iconSize | `number`                                                       | `undefined` | 图标尺寸（px）；不传时按按钮 size 回退：small 14 / medium 16                        |
| type     | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 按钮语义类型                                                              |
| variant  | `'solid' \| 'outline' \| 'ghost'`                              | `'ghost'`   | 视觉变体：solid 实心填充 / outline 描边 / ghost 透明                             |
| size     | `'small' \| 'medium'`                                          | `'medium'`  | 按钮尺寸：small 28×28 / medium 32×32，默认 'medium'；未传 iconSize 时同时决定图标默认大小 |
| disabled | `boolean`                                                      | `false`     | 是否禁用；禁用后点击不触发 click，并应用半透明/不可点击样式                                   |
| title    | `string`                                                       | —           | hover/tooltip 提示                                                    |

### Events

| 事件名     | 参数                | 说明                                          |
| --- | --- | --- |
| `click` | event: MouseEvent | 点击按钮时触发（disabled 时不触发），负载为原生鼠标事件 MouseEvent |
