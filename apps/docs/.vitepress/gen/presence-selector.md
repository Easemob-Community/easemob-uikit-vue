<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## PresenceSelector API

### Props

| 属性                | 类型        | 默认值     | 说明                                          |
| --- | --- | --- | --- |
| value             | `string`  | —       | 当前自定义状态文本                                   |
| showCustom        | `boolean` | `true`  | 是否允许自定义状态，默认 true                           |
| customPlaceholder | `string`  | —       | 自定义状态输入框占位符                                 |
| compact           | `boolean` | `false` | 紧凑模式，popup 场景下更窄的宽度与更小的内边距                  |
| showHeader        | `boolean` | `true`  | 是否展示标题头部，默认 true                            |
| useCustomModal    | `boolean` | `false` | 自定义状态是否使用独立 Modal 输入，默认 false（保持 inline 输入） |

### Events

| 事件名            | 参数                                         | 说明 |
| --- | --- | --- |
| `select`       | status: PresenceSelectorValue, ext: string | —  |
| `cancel`       | —                                          | —  |
| `custom-click` | —                                          | —  |
