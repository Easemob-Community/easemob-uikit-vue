<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ContactTransferModal API

### Props

| 属性          | 类型                  | 默认值        | 说明                                 |
| --- | --- | --- | --- |
| show        | `boolean`           | —          | 是否显示弹窗（v-model:show 受控）            |
| title       | `string`            | `''`       | 弹窗标题，默认按当前语言显示「选择成员」               |
| selectedIds | `string[]`          | `() => []` | 已选中 id 列表（v-model:selected-ids 受控） |
| maxSelected | `number`            | —          | 最大可选数量，超过会被回滚并 emit max-exceed     |
| disabledFn  | `ContactDisabledFn` | —          | 左栏条目禁用判定（如：排除自己 / 已在群成员）           |
| confirmText | `string`            | `''`       | 「确认」按钮文案，默认按当前语言显示「确认」             |
| cancelText  | `string`            | `''`       | 「取消」按钮文案，默认按当前语言显示「取消」             |
| loading     | `boolean`           | `false`    | 确认按钮加载态（异步提交期间禁止重复点击）              |

### Events

| 事件名                  | 参数             | 说明                                        |
| --- | --- | --- |
| `update:show`        | value: boolean | 显示状态变化时触发，供 v-model:show 双向同步             |
| `update:selectedIds` | ids: string[]  | 选中变化时触发，供 v-model:selected-ids 双向同步       |
| `confirm`            | ids: string[]  | 点击「确认」按钮时触发，负载为当前选中 id 列表（不自动关闭，由业务侧决定后续） |
| `cancel`             | —              | 点击「取消」按钮或右上角关闭时触发（随后自动关闭弹窗）               |
| `max-exceed`         | max: number    | 左栏选择超过 maxSelected 时触发                    |
