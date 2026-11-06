# useUserInfo

读取指定用户的资料、联系人关系、展示名和头像，并提供资料订阅操作。

## 导入与签名

```ts
import { useUserInfo } from '@easemob-community/uikit-im'

const state = useUserInfo(userId, attributes)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `userId` | `MaybeRefOrGetter<string \| undefined>` | — | 支持响应式用户 ID |
| `attributes` | `UserInfoAttribute[]` | `['nickname', 'avatarUrl']` | 需要读取的用户属性 |

## 返回值

返回 `userInfo`、`contact`、`displayName`、`avatarUrl`，以及 `unsubscribeUsersInfo(userIds)` 和 `getSubscribedUsers()`。

## 最小用法

```ts
const userId = ref('user-b')
const { displayName, avatarUrl } = useUserInfo(userId)
```

展示名会结合联系人备注与用户资料；响应式 ID 变化时自动重新计算。
