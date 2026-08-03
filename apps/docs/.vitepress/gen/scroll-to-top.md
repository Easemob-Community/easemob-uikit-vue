<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ScrollToTop API

### Props

| 属性               | 类型                    | 默认值                       | 说明                               |
| target           | `HTMLElement \| null` | `null`                    | 监听滚动的目标元素，默认 null 表示监听 window    |
| visibilityHeight | `number`              | `200`                     | 滚动多少像素后显示按钮，默认 200               |
| duration         | `number`              | `300`                     | 滚动到顶部的动画持续时间（ms），默认 300          |
| right            | `number`              | `16`                      | 按钮右侧偏移量，默认 16px                  |
| bottom           | `number`              | `16`                      | 按钮底部偏移量，默认 16px                  |
| icon             | `string`              | `'arrows/arrow_up_thick'` | 自定义图标名称，默认 arrows/arrow_up_thick |
| size             | `number`              | `36`                      | 按钮大小，默认 36                       |

### Events

| 事件名     | 参数 | 说明 |
| `click` | —  | —  |
