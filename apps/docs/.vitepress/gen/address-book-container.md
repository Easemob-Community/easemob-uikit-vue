<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## AddressBookContainer API

### Props

| 属性                     | 类型                                | 默认值                                                          | 说明                                                        |
| --- | --- | --- | --- |
| showHeader             | `boolean`                         | `true`                                                       | 是否展示头部，默认 true                                            |
| title                  | `string`                          | —                                                            | Header 标题                                                 |
| headerAlign            | `'left' \| 'center' \| 'right'`   | `'left'`                                                     | Header 对齐方式，默认 left                                       |
| showSearch             | `boolean`                         | `true`                                                       | 是否展示搜索框（home 生效），默认 true                                  |
| class                  | `string`                          | —                                                            | 自定义根元素 class                                              |
| style                  | `Record<string, string>`          | —                                                            | 自定义根元素 style                                              |
| transition             | `AddressBookContainerTransition`  | `'slide'`                                                    | 视图切换过场，默认 'slide'                                         |
| entries                | `AddressBookContainerEntry[]`     | —                                                            | 自定义入口列表，传入后按数组顺序展示，可与内置入口共存                               |
| showNotice             | `boolean`                         | `true`                                                       | 是否展示「通知」入口，默认 true                                        |
| showGroup              | `boolean`                         | `true`                                                       | 是否展示「群组」入口，默认 true（Provider.enableGroup=false 时强制隐藏）      |
| showContact            | `boolean`                         | `true`                                                       | 是否展示「联系人」入口，默认 true                                       |
| showBlocklist          | `boolean`                         | `true`                                                       | 是否展示「黑名单」入口，默认 true（Provider.enableBlocklist=false 时强制隐藏） |
| noticeCount            | `number`                          | `undefined`                                                  | 「通知」徽标数量，默认 0（外部注入）                                       |
| groupCount             | `number`                          | —                                                            | 「群组」入口右侧数量，不传默认取 store 实际数量；传 0 则不展示                      |
| contactCount           | `number`                          | —                                                            | 「联系人」入口右侧数量，不传默认取 store 实际数量；传 0 则不展示                     |
| autoEntryCount         | `boolean`                         | `true`                                                       | 是否自动从 store 推断 groupCount/contactCount（仅未显式传入时生效），默认 true |
| entryOrder             | `AddressBookContainerEntryKey[]`  | `() => ['notice', 'group', 'contact', 'blocklist'] as const` | 入口顺序，默认 ['notice', 'group', 'contact', 'blocklist']       |
| noticeLabel            | `string`                          | —                                                            | 自定义入口标签，不传则走 i18n                                         |
| groupLabel             | `string`                          | —                                                            | —                                                         |
| contactLabel           | `string`                          | —                                                            | —                                                         |
| blocklistLabel         | `string`                          | —                                                            | —                                                         |
| noticeIcon             | `string`                          | —                                                            | 自定义入口图标                                                   |
| groupIcon              | `string`                          | —                                                            | —                                                         |
| contactIcon            | `string`                          | —                                                            | —                                                         |
| blocklistIcon          | `string`                          | —                                                            | —                                                         |
| noticePersistInvites   | `boolean \| 'local' \| 'session'` | `false`                                                      | 是否持久化未处理通知（好友申请 + 群邀请），开启后首页徽标在刷新后也能立即显示红点                |
| initialView            | `AddressBookContainerView`        | —                                                            | 初始视图（默认 home）                                             |
| showContactAddButton   | `boolean`                         | `true`                                                       | 是否在联系人子视图头部展示添加好友按钮，默认 true                               |
| showGroupCreateButton  | `boolean`                         | `true`                                                       | 是否在群组子视图头部展示创建群组按钮，默认 true                                |
| showBlocklistAddButton | `boolean`                         | `true`                                                       | 是否在黑名单子视图头部展示「添加黑名单」按钮，默认 true                            |

### Events

| 事件名               | 参数                             | 说明 |
| --- | --- | --- |
| `view-change`     | view: AddressBookContainerView | —  |
| `notice-click`    | —                              | —  |
| `entry-click`     | key: string                    | —  |
| `home-search`     | keyword: string                | —  |
| `add-contact`     | —                              | —  |
| `create-group`    | —                              | —  |
| `blocklist-click` | —                              | —  |
| `blocklist-add`   | —                              | —  |

### Slots

| 插槽名               | 说明 |
| --- | --- |
| `header`          | —  |
| `header-extra`    | —  |
| `nav`             | —  |
| `nav-entry`       | —  |
| `nav-entry-extra` | —  |
| `home-body`       | —  |
| `home-footer`     | —  |
| `watermark`       | —  |
| `back-icon`       | —  |
| `subheader-extra` | —  |
| `notice`          | —  |
