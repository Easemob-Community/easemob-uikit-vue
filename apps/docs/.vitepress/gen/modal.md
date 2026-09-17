<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Modal API

### Props

| 属性                  | 类型                                                          | 默认值                         | 说明                                                                                                                                                                |
| --- | --- | --- | --- |
| show                | `boolean`                                                   | —                           | 是否显示弹窗（v-model:show 受控）                                                                                                                                           |
| title               | `string`                                                    | `''`                        | 弹窗标题，为空时不渲染标题文本（showClose 为 true 时 header 行仍保留）                                                                                                                   |
| titleAlign          | `'left' \| 'center'`                                        | `'left'`                    | 标题对齐方式：left（默认，设计稿形态）/ center                                                                                                                                     |
| showClose           | `boolean`                                                   | `true`                      | 是否显示右上角关闭按钮，默认 true                                                                                                                                               |
| showHeaderDivider   | `boolean`                                                   | —                           | 是否显示 header 下分割线；不传时跟随全局 theme.headerBorder 开关（默认关闭），显式传入优先                                                                                                       |
| width               | `number`                                                    | `420`                       | 弹窗宽度（px），默认 420；桌面端实际宽度 = min(width, 视口宽 × --uikit-modal-width-ratio)，<br>随屏幕宽度按比例自适应（ratio 默认 0.5，宿主可覆写该 CSS 变量调整占屏比），最小不小于 280px                                |
| height              | `number`                                                    | `0`                         | 弹窗高度（px），不传时由内容撑开；受 90vh 上限约束                                                                                                                                     |
| contentAlign        | `'left' \| 'center'`                                        | —                           | 正文对齐方式：left / center（Text-Icon 居中变体）；不传时按 type 自动判定——<br>通知类（type 非 default，带语义图标）居中，其余左对齐；显式传入优先                                                                 |
| icon                | `string`                                                    | `''`                        | 正文图标名（Text-Icon 模式），格式 "category/icon-name"，如 "circle/bang"；也可用 #icon 插槽接管。<br>不传时按 type 内置语义图标（参考 Toast：danger/warning/info → 感叹号圆，success → 对勾圆）                |
| showFooter          | `boolean`                                                   | `true`                      | 是否显示底部按钮区，默认 true；列表/搜索类弹窗可置 false 并用默认插槽自绘内容                                                                                                                     |
| footerAlign         | `'right' \| 'stretch'`                                      | `'right'`                   | 底部按钮布局：right（默认，右对齐 pill 按钮）/ stretch（等宽铺满，兼容旧形态）                                                                                                                 |
| showCancel          | `boolean`                                                   | `true`                      | 是否显示「取消」按钮，默认 true                                                                                                                                                |
| cancelText          | `string`                                                    | `t('button.cancel', '取消')`  | 「取消」按钮文案，默认按当前语言显示「取消」                                                                                                                                            |
| confirmText         | `string`                                                    | `t('button.confirm', '确认')` | 「确认」按钮文案，默认按当前语言显示「确认」                                                                                                                                            |
| closeOnClickOverlay | `boolean`                                                   | `false`                     | 点击遮罩是否关闭弹窗，默认 false（需通过按钮或 ESC 关闭）                                                                                                                                |
| type                | `'default' \| 'danger' \| 'warning' \| 'info' \| 'success'` | `'default'`                 | 弹窗类型：default（默认）/ danger（危险操作，确认按钮变红色）/ warning / info / success；<br>非 default 时正文自动带对应语义图标（icon prop / #icon 插槽可覆盖）；<br>图标默认脱色（主文字色），语义着色需显式开启 semanticIconColor |
| semanticIconColor   | `boolean`                                                   | `false`                     | 语义图标是否按类型着色（warning 橙 / danger 红 等），默认 false 脱色展示                                                                                                                 |
| confirmDisabled     | `boolean`                                                   | `false`                     | 确认按钮禁用态（如未选择成员时禁止提交），默认 false                                                                                                                                     |
| confirmLoading      | `boolean`                                                   | `false`                     | 确认按钮加载态（异步提交期间），默认 false                                                                                                                                          |
| confirmAutoClose    | `boolean`                                                   | `true`                      | 点击确认后是否自动关闭弹窗，默认 true；异步表单类弹窗置 false，由业务侧在成功后自行关闭                                                                                                                 |
| bodyFlush           | `boolean`                                                   | `false`                     | 正文是否贴边（去除 body 内边距并撑满高度），列表/搜索类弹窗使用，默认 false                                                                                                                      |

### Events

| 事件名           | 参数             | 说明                                                        |
| --- | --- | --- |
| `update:show` | value: boolean | 显示状态变化时触发（确认/取消/遮罩或 ESC 关闭），负载为最新显示状态，供 v-model:show 双向同步 |
| `confirm`     | —              | 点击「确认」按钮时触发（随后自动关闭弹窗）                                     |
| `cancel`      | —              | 点击「取消」按钮、右上角关闭、遮罩或按 ESC 关闭时触发（随后自动关闭弹窗）                   |

### Slots

| 插槽名      | 说明 |
| --- | --- |
| `title`  | —  |
| `icon`   | —  |
| `footer` | —  |
