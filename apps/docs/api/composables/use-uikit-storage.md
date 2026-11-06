# useUIKitStorage

按当前 appKey 和用户隔离持久化状态，并返回可写的 Vue `Ref`。

## 导入与签名

```ts
import { useUIKitStorage } from '@easemob-community/uikit-im'

const value = useUIKitStorage<T>(suffix, defaultValue, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `suffix` | `string` | 存储 key 的业务后缀 |
| `defaultValue` | `T` | 无缓存或解析失败时的默认值 |
| `options.type` | `UIKitStorageType` | 可选，存储后端类型 |

## 返回值

返回 `Ref<T>`。完整 key 由 UIKit 根据当前 appKey、用户和后缀生成，账号切换时自动隔离。

## 最小用法

```ts
const draft = useUIKitStorage('draft_user-b', '', { type: 'local' })
draft.value = '待发送内容'
```

存储后端不可用时回退到内存状态，不阻断界面。
