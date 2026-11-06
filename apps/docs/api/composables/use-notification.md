# useNotification

管理页内通知和浏览器通知，包括权限、触发方式、点击回调和统一开关。

## 导入与签名

```ts
import { useNotification } from '@easemob-community/uikit-im'

const notification = useNotification()
```

## 返回值

- **状态与展示**：`state`、`notify`、`close`、`closeAll`。
- **渠道开关**：`setEnabled`、`setBrowserEnabled`、`setInAppEnabled`。
- **行为配置**：`setTriggerMode`、`configureNotification`。
- **浏览器通知**：`ensureBrowserPermission`、`notifyBrowser`。
- **回调**：`setNotificationClickHandler`、`setNotificationHandler`。

## 最小用法

```ts
const { notify, closeAll, ensureBrowserPermission } = useNotification()

notify({ title: '新消息', content: '你有一条新消息' })
```

浏览器通知需要用户授权；页内通知与浏览器通知可分别开关。
