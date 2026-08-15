<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ActionSheet API

### Props

| 属性         | 类型                  | 默认值                        | 说明                                        |
| --- | --- | --- | --- |
| show       | `boolean`           | —                          | 是否显示操作面板，控制底部弹层开合；配合 v-model:show 使用      |
| title      | `string`            | `''`                       | 顶部标题文案，为空时不渲染标题栏                          |
| actions    | `ActionSheetItem[]` | —                          | 操作项列表，每项渲染为一行可点击操作；disabled 项点击不触发 select |
| cancelText | `string`            | `t('button.cancel', '取消')` | 底部取消按钮文案，默认取 i18n 的「取消」                   |

### Events

| 事件名           | 参数                                   | 说明                                                       |
| --- | --- | --- |
| `update:show` | value: boolean                       | 显隐状态变化时触发（选中操作项 / 取消 / 遮罩关闭均携带 false），用于 v-model:show 同步 |
| `select`      | item: ActionSheetItem, index: number | 点击非禁用操作项时触发，负载为选中项对象与其下标 index                           |
| `cancel`      | —                                    | 点击底部取消按钮或弹层关闭（如点击遮罩）时触发                                  |
