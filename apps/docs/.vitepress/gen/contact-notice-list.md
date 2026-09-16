<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ContactNoticeList API

### Props

| 属性      | 类型                  | 默认值         | 说明                                                      |
| --- | --- | --- | --- |
| invites | `UiContactInvite[]` | `undefined` | —                                                       |
| loading | `boolean`           | `false`     | —                                                       |
| persist | `InvitePersistType` | `false`     | 是否持久化未处理通知（true = localStorage，或指定 'local' / 'session'） |

### Events

| 事件名       | 参数                      | 说明 |
| --- | --- | --- |
| `accept`  | invite: UiContactInvite | —  |
| `decline` | invite: UiContactInvite | —  |
