<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Input API

### Props

| 属性          | 类型                                                            | 默认值               | 说明                                                                                                                                                                                           |
| --- | --- | --- | --- |
| modelValue  | `string`                                                      | `''`              | 输入框当前值（v-model 绑定）                                                                                                                                                                           |
| placeholder | `string`                                                      | —                 | 占位提示文案，无输入时显示                                                                                                                                                                                |
| type        | `'text' \| 'password' \| 'number'`                            | `'text'`          | 原生输入类型：text 文本 / password 密码 / number 数字，默认 'text'                                                                                                                                           |
| disabled    | `boolean`                                                     | `false`           | 是否禁用输入                                                                                                                                                                                       |
| maxlength   | `number`                                                      | —                 | 最大可输入字符数，超出后无法继续输入                                                                                                                                                                           |
| prefixIcon  | `string`                                                      | —                 | 前缀图标名称，格式 "category/icon-name"，如 "misc/magnifier2"                                                                                                                                           |
| clearable   | `boolean`                                                     | `false`           | 是否显示清除按钮（有输入内容时右侧出现）。<br>默认清除图标为 `actions/close`，搜索场景可传 `clear-icon="misc/search_clear"`。                                                                                                    |
| clearIcon   | `string`                                                      | `'actions/close'` | 清除按钮图标名称，默认 "actions/close"                                                                                                                                                                  |
| variant     | `'default' \| 'search' \| 'filled' \| 'ghost' \| 'underline'` | `'default'`       | 输入框风格变体<br>- 'default': 白色背景 + 边框 + 圆角，适用于表单输入（默认）<br>- 'search': 白底 + 底部细线，适用于搜索框<br>- 'filled': 灰色背景 + 无边框 + 圆角，旧搜索风格<br>- 'ghost': 完全透明 + 聚焦时底部细线，极简风格<br>- 'underline': 无背景 + 仅底部一条线，最极简 |

### Events

| 事件名                 | 参数                | 说明                                              |
| --- | --- | --- |
| `update:modelValue` | value: string     | 输入内容变化时触发，负载为最新输入值，供 v-model 双向同步               |
| `input`             | event: Event      | 输入事件，负载为原生 input 事件对象（与 update:modelValue 同时触发） |
| `focus`             | event: FocusEvent | 输入框获得焦点时触发，负载为原生 focus 事件                       |
| `blur`              | event: FocusEvent | 输入框失去焦点时触发，负载为原生 blur 事件                        |
| `submit`            | value: string     | 按下回车（非 Shift+Enter）时触发，负载为当前输入值，常用于搜索/提交        |
