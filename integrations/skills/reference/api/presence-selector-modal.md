<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## PresenceSelectorModal API

### Props

| 属性    | 类型        | 默认值 | 说明                                        |
| --- | --- | --- | --- |
| show  | `boolean` | —   | —                                         |
| value | `string`  | —   | 当前在线状态描述（ext），未传时自动从当前登录用户的 presence 缓存读取 |

### Events

| 事件名           | 参数             | 说明 |
| --- | --- | --- |
| `update:show` | value: boolean | —  |
| `close`       | —              | —  |
