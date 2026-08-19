<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Modal API

### Props

| 属性                  | 类型                      | 默认值                         | 说明                                     |
| --- | --- | --- | --- |
| show                | `boolean`               | —                           | 是否显示弹窗（v-model:show 受控）                |
| title               | `string`                | `''`                        | 弹窗标题，为空时不渲染标题区域                        |
| showCancel          | `boolean`               | `true`                      | 是否显示「取消」按钮，默认 true                     |
| cancelText          | `string`                | `t('button.cancel', '取消')`  | 「取消」按钮文案，默认按当前语言显示「取消」                 |
| confirmText         | `string`                | `t('button.confirm', '确认')` | 「确认」按钮文案，默认按当前语言显示「确认」                 |
| closeOnClickOverlay | `boolean`               | `false`                     | 点击遮罩是否关闭弹窗，默认 false（需通过按钮或 ESC 关闭）     |
| type                | `'default' \| 'danger'` | `'default'`                 | 弹窗类型：default（默认）/ danger（危险操作，确认按钮变红色） |

### Events

| 事件名           | 参数             | 说明                                                        |
| --- | --- | --- |
| `update:show` | value: boolean | 显示状态变化时触发（确认/取消/遮罩或 ESC 关闭），负载为最新显示状态，供 v-model:show 双向同步 |
| `confirm`     | —              | 点击「确认」按钮时触发（随后自动关闭弹窗）                                     |
| `cancel`      | —              | 点击「取消」按钮、遮罩或按 ESC 关闭时触发（随后自动关闭弹窗）                         |
