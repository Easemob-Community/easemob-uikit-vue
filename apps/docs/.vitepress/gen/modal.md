<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Modal API

### Props

| 属性                  | 类型        | 默认值                         | 说明 |
| show                | `boolean` | —                           | —  |
| title               | `string`  | `''`                        | —  |
| showCancel          | `boolean` | `true`                      | —  |
| cancelText          | `string`  | `t('button.cancel', '取消')`  | —  |
| confirmText         | `string`  | `t('button.confirm', '确认')` | —  |
| closeOnClickOverlay | `boolean` | `false`                     | —  |

### Events

| 事件名           | 参数             | 说明 |
| `update:show` | value: boolean | —  |
| `confirm`     | —              | —  |
| `cancel`      | —              | —  |
