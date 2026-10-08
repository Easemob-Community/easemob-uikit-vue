<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ActionSheet API

### Props

| 属性         | 类型                  | 默认值                        | 说明                                                                                                                                                         |
| --- | --- | --- | --- |
| show       | `boolean`           | —                          | 是否显示操作面板，控制底部弹层开合；配合 v-model:show 使用                                                                                                                       |
| title      | `string`            | `''`                       | 顶部标题文案，为空时不渲染标题栏                                                                                                                                           |
| actions    | `ActionSheetItem[]` | —                          | 操作项列表，每项渲染为一行可点击操作（zone='grid' 的项收拢到顶部网格区）；disabled 项点击不触发 select                                                                                          |
| cancelText | `string`            | `t('button.cancel', '取消')` | 底部取消按钮文案，默认取 i18n 的「取消」                                                                                                                                    |
| expandable | `boolean`           | `false`                    | 是否启用半屏/展开双档拖拽（默认 false）：顶部渲染 drag handle，<br>半屏档内容上限 50dvh，拖拽 handle 上拉展开到 78dvh（受 EmPopup bottom 80dvh 上限约束），<br>松手按拖动方向吸附档位，轻点 handle 直接切换档位；展开后列表区纵向滚动。 |

### Events

| 事件名           | 参数                                   | 说明                                                       |
| --- | --- | --- |
| `update:show` | value: boolean                       | 显隐状态变化时触发（选中操作项 / 取消 / 遮罩关闭均携带 false），用于 v-model:show 同步 |
| `select`      | item: ActionSheetItem, index: number | 点击非禁用操作项时触发，负载为选中项对象与其在 actions 数组中的下标 index             |
| `cancel`      | —                                    | 点击底部取消按钮或弹层关闭（如点击遮罩）时触发                                  |
