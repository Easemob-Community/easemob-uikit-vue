# useUserInfo

读取指定用户的资料、联系人关系、展示名和头像，并提供资料订阅操作。

## 导入与签名

```ts
import { useUserInfo } from '@easemob-community/uikit-im'
import type { UseUserInfoOptions } from '@easemob-community/uikit-im'

const state = useUserInfo(userId, attributes, options)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `userId` | `MaybeRefOrGetter<string \| undefined>` | — | 支持响应式用户 ID |
| `attributes` | `UserInfoAttribute[]` | `['nickname', 'avatarUrl']` | 需要读取的用户属性 |
| `options` | `UseUserInfoOptions` | `{}` | `source` 设置日志来源；`subscribe` 控制是否订阅资料变更，默认 `true` |

`UseUserInfoOptions` 可从 `@easemob-community/uikit-im` 直接导入。

会话、联系人、群成员（含聊天信息抽屉宫格与群管理名单）、消息气泡/引用/置顶/合并消息等内置高频项默认不订阅资料变更；进入单聊/详情/名片等单用户场景仍保持默认订阅。

## 返回值

返回 `userInfo`、`contact`、`displayName`、`avatarUrl`，以及 `unsubscribeUsersInfo(userIds)` 和 `getSubscribedUsers()`。

## 最小用法

```ts
const userId = ref('user-b')
const { displayName, avatarUrl } = useUserInfo(userId)
```

展示名会结合联系人备注与用户资料；响应式 ID 变化时自动重新计算。
