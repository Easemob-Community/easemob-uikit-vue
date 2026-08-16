<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveWelcomeBanner API

### Props

| 属性    | 类型        | 默认值     | 说明                       |
| --- | --- | --- | --- |
| show  | `boolean` | —       | 显示控制（true 触发入场，3s 后自动退场） |
| name  | `string`  | `''`    | 欢迎的用户名（组件内脱敏）            |
| isVip | `boolean` | `false` | VIP 用户（皇冠图标 + 高亮）        |

### Events

| 事件名      | 参数 | 说明                         |
| --- | --- | --- |
| `hidden` | —  | 横幅退场完成（页面复位 show 或接续下一条欢迎） |
