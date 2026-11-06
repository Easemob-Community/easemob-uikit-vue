# useOwnUserInfo

读取和更新当前登录用户的资料、展示名与头像。

## 导入与签名

```ts
import { useOwnUserInfo } from '@easemob-community/uikit-im'

const own = useOwnUserInfo()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `userInfo` | 当前用户资料 |
| `displayName` / `avatarUrl` | 当前用户展示名与头像 |
| `updateOwnInfo(...)` | 更新当前用户资料 |
| `updateOwnInfoByAttribute(...)` | 按属性更新资料 |

## 最小用法

```ts
const { displayName, avatarUrl, updateOwnInfoByAttribute } = useOwnUserInfo()
await updateOwnInfoByAttribute('nickname', '新昵称')
```

必须在已初始化的 Provider 上下文中使用；当前用户 ID 来自连接状态。
