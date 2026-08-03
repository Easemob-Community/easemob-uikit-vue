<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Input API

### Props

| 属性          | 类型                                                            | 默认值         | 说明                                                 |
| --- | --- | --- | --- |
| modelValue  | `string`                                                      | `''`        | —                                                  |
| placeholder | `string`                                                      | —           | —                                                  |
| type        | `'text' \| 'password' \| 'number'`                            | `'text'`    | —                                                  |
| disabled    | `boolean`                                                     | `false`     | —                                                  |
| maxlength   | `number`                                                      | —           | —                                                  |
| prefixIcon  | `string`                                                      | —           | 前缀图标名称，格式 "category/icon-name"，如 "misc/magnifier2" |
| variant     | `'default' \| 'search' \| 'filled' \| 'ghost' \| 'underline'` | `'default'` | 输入框风格变体                                            |

### Events

| 事件名                 | 参数                | 说明 |
| --- | --- | --- |
| `update:modelValue` | value: string     | —  |
| `input`             | event: Event      | —  |
| `focus`             | event: FocusEvent | —  |
| `blur`              | event: FocusEvent | —  |
| `submit`            | value: string     | —  |
