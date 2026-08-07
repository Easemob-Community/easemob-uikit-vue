<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ImageViewer API

### Props

| 属性                  | 类型         | 默认值     | 说明                    |
| --- | --- | --- | --- |
| srcs                | `string[]` | —       | 图片 URL 列表（多图相册）       |
| index               | `number`   | `0`     | 当前展示索引（v-model:index） |
| show                | `boolean`  | `false` | 是否显示（v-model:show 受控） |
| showToolbar         | `boolean`  | `true`  | 是否显示工具栏（缩放/旋转/适应屏/下载） |
| showNavigator       | `boolean`  | `true`  | 是否显示多图切换箭头与索引指示       |
| closeOnClickOverlay | `boolean`  | `true`  | 点击遮罩是否关闭              |

### Events

| 事件名            | 参数                         | 说明                       |
| --- | --- | --- |
| `update:show`  | value: boolean             | —                        |
| `update:index` | value: number              | —                        |
| `close`        | —                          | —                        |
| `load`         | index: number              | 当前图片加载完成                 |
| `load-error`   | index: number              | 当前图片加载失败（业务侧可据此做降级切换）    |
| `download`     | url: string, index: number | 下载动作触发（组件内部执行下载，事件供业务感知） |

### Slots

| 插槽名      | 说明 |
| --- | --- |
| `footer` | —  |
