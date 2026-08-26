<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Toast API

### Props

| 属性         | 类型                                            | 默认值        | 说明                                                          |
| --- | --- | --- | --- |
| show       | `boolean`                                     | —          | 是否显示 toast（v-model:show 受控）                                 |
| message    | `string`                                      | —          | 提示文案内容                                                      |
| type       | `'info' \| 'success' \| 'error' \| 'warning'` | `'info'`   | 提示类型：info 信息 / success 成功 / error 错误 / warning 警告，默认 'info' |
| duration   | `number`                                      | `2000`     | 自动关闭延时（ms），默认 2000；传 0 表示不自动关闭                              |
| closable   | `boolean`                                     | `false`    | 是否显示手动关闭按钮，默认 false                                         |
| position   | `'top' \| 'center' \| 'bottom'`               | `'center'` | 位置：top 顶部 / center 居中（默认）/ bottom 底部                        |
| actionText | `string`                                      | `''`       | 操作按钮文案；传入时显示在消息右侧，点击后触发 action 事件                           |

### Events

| 事件名           | 参数             | 说明                                                 |
| --- | --- | --- |
| `update:show` | value: boolean | 自动关闭计时（duration）到期后触发，负载 false，供 v-model:show 双向同步 |
| `action`      | —              | 点击操作按钮时触发                                          |

### Slots

| 插槽名      | 说明 |
| --- | --- |
| `action` | —  |
