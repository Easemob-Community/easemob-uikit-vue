# 通用工具

## isEmpty

```ts
isEmpty(val: unknown): boolean
```

仅当值为 `undefined`、`null` 或空字符串时返回 `true`；`0` 和 `false` 不属于空值。

## debounce

```ts
debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay?: number,
): (...args: Parameters<T>) => void
```

返回防抖函数，连续调用只执行最后一次，`delay` 默认 `300`ms。

## throttle

```ts
throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit?: number,
): (...args: Parameters<T>) => void
```

返回节流函数，时间窗口内只执行首次调用，`limit` 默认 `300`ms。
