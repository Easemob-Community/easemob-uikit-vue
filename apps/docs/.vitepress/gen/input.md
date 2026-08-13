<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Input API

### Props

| 属性          | 类型                                                            | 默认值               | 说明                                                                                                                                                                                           |
| --- | --- | --- | --- |
| modelValue  | `string`                                                      | `''`              | —                                                                                                                                                                                            |
| placeholder | `string`                                                      | —                 | —                                                                                                                                                                                            |
| type        | `'text' \| 'password' \| 'number'`                            | `'text'`          | —                                                                                                                                                                                            |
| disabled    | `boolean`                                                     | `false`           | —                                                                                                                                                                                            |
| maxlength   | `number`                                                      | —                 | —                                                                                                                                                                                            |
| prefixIcon  | `string`                                                      | —                 | 前缀图标名称，格式 "category/icon-name"，如 "misc/magnifier2"                                                                                                                                           |
| clearable   | `boolean`                                                     | `false`           | 是否显示清除按钮（有输入内容时右侧出现）。<br>默认清除图标为 `actions/close`，搜索场景可传 `clear-icon="misc/search_clear"`。                                                                                                    |
| clearIcon   | `string`                                                      | `'actions/close'` | 清除按钮图标名称，默认 "actions/close"                                                                                                                                                                  |
| variant     | `'default' \| 'search' \| 'filled' \| 'ghost' \| 'underline'` | `'default'`       | 输入框风格变体<br>- 'default': 白色背景 + 边框 + 圆角，适用于表单输入（默认）<br>- 'search': 白底 + 底部细线，适用于搜索框<br>- 'filled': 灰色背景 + 无边框 + 圆角，旧搜索风格<br>- 'ghost': 完全透明 + 聚焦时底部细线，极简风格<br>- 'underline': 无背景 + 仅底部一条线，最极简 |

### Events

| 事件名                 | 参数                | 说明 |
| --- | --- | --- |
| `update:modelValue` | value: string     | —  |
| `input`             | event: Event      | —  |
| `focus`             | event: FocusEvent | —  |
| `blur`              | event: FocusEvent | —  |
| `submit`            | value: string     | —  |
