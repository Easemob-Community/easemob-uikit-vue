<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Icon API

### Props

| 属性    | 类型                                                                       | 默认值              | 说明                                                              |
| --- | --- | --- | --- |
| name  | `string`                                                                 | —                | 图标名称，格式 "category/icon-name"，如 "actions/trash"；传入 name 后无需 slot |
| size  | `number`                                                                 | `20`             | —                                                               |
| color | `string`                                                                 | `'currentColor'` | —                                                               |
| type  | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | —                | 语义色类型；与 color 同时存在时 color 优先级更高                                 |
