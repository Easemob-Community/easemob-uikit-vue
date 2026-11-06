# useBlocklist

读取黑名单并提供刷新、加入、移除和状态判断。

## 导入与签名

```ts
import { useBlocklist } from '@easemob-community/uikit-im'

const blocklist = useBlocklist()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `blockList` | 响应式黑名单 |
| `isBlocked(userId)` | 判断用户是否被屏蔽 |
| `refresh()` | 刷新黑名单 |
| `addBlock(contact)` / `removeBlock(userId)` | 加入或移出黑名单 |

## 最小用法

```ts
const { blockList, isBlocked, addBlock, removeBlock } = useBlocklist()
await addBlock({ userId: 'user-b', name: '用户 B' })
```

功能受 `features` 与当前 SDK 联系人能力约束。
