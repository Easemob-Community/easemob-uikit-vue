<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomContextMenu API

### Props

| 属性    | 类型                          | 默认值 | 说明                     |
| --- | --- | --- | --- |
| show  | `boolean`                   | —   | 是否显示（v-model:show 受控）  |
| x     | `number`                    | —   | 触发点坐标（clientX/clientY） |
| y     | `number`                    | —   | 触发点坐标（clientY）         |
| items | `ChatroomContextMenuItem[]` | —   | 菜单项列表                  |

### Events

| 事件名           | 参数                                           | 说明             |
| --- | --- | --- |
| `update:show` | value: boolean                               | —              |
| `select`      | item: ChatroomContextMenuItem, index: number | 选中菜单项（已自动关闭菜单） |
