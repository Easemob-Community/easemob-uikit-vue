<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Switch API

### Props

| 属性         | 类型                    | 默认值        | 说明                                                               |
| --- | --- | --- | --- |
| modelValue | `boolean`             | `false`    | 开关状态（v-model）/ Switch state, used with v-model                   |
| size       | `'medium' \| 'small'` | `'medium'` | 尺寸：medium（默认）/ small / Size: medium (default) or small           |
| disabled   | `boolean`             | `false`    | 是否禁用；禁用时不可点击且不触发事件 / Disabled: not clickable and no events fired |

### Events

| 事件名                 | 参数             | 说明                                                           |
| --- | --- | --- |
| `update:modelValue` | value: boolean | 状态变化时同步 v-model / Fired on toggle to sync v-model            |
| `change`            | value: boolean | 状态变化后的业务回调，负载为切换后的新值 / Fired after toggle with the new value |
