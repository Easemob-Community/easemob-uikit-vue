<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Toast API

### Props

| 属性       | 类型                                            | 默认值      | 说明                                                          |
| --- | --- | --- | --- |
| show     | `boolean`                                     | —        | 是否显示 toast（v-model:show 受控）                                 |
| message  | `string`                                      | —        | 提示文案内容                                                      |
| type     | `'info' \| 'success' \| 'error' \| 'warning'` | `'info'` | 提示类型：info 信息 / success 成功 / error 错误 / warning 警告，默认 'info' |
| duration | `number`                                      | `2000`   | 自动关闭延时（ms），默认 2000；到点后触发 update:show(false)                 |

### Events

| 事件名           | 参数             | 说明                                                 |
| --- | --- | --- |
| `update:show` | value: boolean | 自动关闭计时（duration）到期后触发，负载 false，供 v-model:show 双向同步 |
