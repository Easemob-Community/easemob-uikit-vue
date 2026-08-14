<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Button API

### Props

| 属性       | 类型                                                                                 | 默认值         | 说明                                                                       |
| --- | --- | --- | --- |
| type     | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'danger-outline' \| 'default'` | `'default'` | 语义类型：primary / success / warning / danger / danger-outline / default（默认） |
| size     | `'small' \| 'medium' \| 'large'`                                                   | `'medium'`  | 尺寸：small / medium（默认）/ large                                             |
| disabled | `boolean`                                                                          | `false`     | 是否禁用；禁用时按钮不可点击且不触发 click                                                 |
| loading  | `boolean`                                                                          | `false`     | 是否加载中；显示加载动画并禁止点击（行为同 disabled）                                          |
| block    | `boolean`                                                                          | `false`     | 是否块级展示，占满父容器整行宽度                                                         |

### Events

| 事件名     | 参数                | 说明                                                    |
| --- | --- | --- |
| `click` | event: MouseEvent | 按钮可点击（非 disabled / 非 loading）时触发，负载为原生点击事件 MouseEvent |
