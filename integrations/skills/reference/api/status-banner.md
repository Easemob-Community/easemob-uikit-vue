<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## StatusBanner API

### Props

| 属性          | 类型                 | 默认值      | 说明                                          |
| --- | --- | --- | --- |
| type        | `StatusBannerType` | `'info'` | 横幅类型，决定颜色与默认图标                              |
| loading     | `boolean`          | `false`  | 是否展示 loading 旋转图标                           |
| closable    | `boolean`          | `false`  | 是否可关闭                                       |
| show        | `boolean`          | `true`   | 是否可见，支持 v-model:show                        |
| icon        | `string`           | —        | 自定义图标名，格式 "category/icon-name"；不传时按 type 默认 |
| title       | `string`           | —        | 标题文本                                        |
| description | `string`           | —        | 描述/副标题文本                                    |
| clickable   | `boolean`          | `false`  | 是否可点击（仅影响光标与 hover 反馈，不控制事件）                |

### Events

| 事件名           | 参数                | 说明                                                        |
| --- | --- | --- |
| `update:show` | value: boolean    | 关闭按钮被点击时发出（配合 v-model:show 收起横幅），负载为新的可见性值 false          |
| `close`       | —                 | 关闭按钮被点击时触发，通知业务方横幅已关闭                                     |
| `click`       | event: MouseEvent | 点击横幅主体时触发（clickable 仅影响视觉反馈，事件始终会发出），负载为原生点击事件 MouseEvent |

### Slots

| 插槽名           | 说明 |
| --- | --- |
| `icon`        | —  |
| `title`       | —  |
| `description` | —  |
| `action`      | —  |
