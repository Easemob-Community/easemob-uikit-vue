# usePullRefresh

为指定元素提供下拉手势、下拉距离和刷新状态。

## 导入与签名

```ts
import { usePullRefresh } from '@easemob-community/uikit-im'

const pull = usePullRefresh(target, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `target` | `Ref<HTMLElement \| undefined>` | 手势目标元素 |
| `options` | `UsePullRefreshOptions` | 刷新回调、阈值等配置 |

`options.threshold` 默认 `80`，达到阈值后进入刷新流程。

## 返回值

返回 `isPulling`、`isRefreshing`、`pullDistance`。

## 最小用法

```ts
const target = ref<HTMLElement>()
const { isRefreshing, pullDistance } = usePullRefresh(target, {
  onRefresh: async () => { await loadLatest() },
})
```
