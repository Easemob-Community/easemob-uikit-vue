# Core 工具

以下函数同样从 `@easemob-community/uikit-im` 主入口导出。

## 时间与链接

- `createConversationTimeFormatter(t)`：创建会话时间格式化函数，返回 `(timestamp: number) => string`。
- `hasUrl(text)`：判断文本是否包含 URL，返回 `boolean`。
- `linkify(text)`：将文本拆成 `LinkSegment[]`，普通文本与链接分段用于安全渲染。

## SDK 错误

| 名称 | 用途 |
| --- | --- |
| `extractSdkErrorReason(error)` | 从 `Error`、字符串或带 `reason` 的对象提取可读原因 |
| `formatSdkError(error)` | 将 SDK 错误转为可序列化形式，其他错误原样返回 |
| `resolveSdkErrorCodeI18nKey(error)` | 将已知 SDK 错误码映射到 i18n key，未知时返回 `null` |
| `resolveSdkErrorI18nKey(reason)` | 根据错误原因匹配连接、权限等 i18n key |
| `resolveSdkErrorMessage(error, fallbackKey, t)` | 依次使用错误码、错误原因和 fallback 生成本地化文案 |

## 下载与环境

- `detectEnvironment()`：返回 `DownloadEnvironment`，识别微信、iOS、Android、PC 和移动端。
- `isCrossOrigin(url)`：判断 URL 是否跨源，非法 URL 返回 `false`。
- `getDownloadStrategy(env?)`：返回当前环境对应的下载策略。
- `downloadFile(options)`：按 `DownloadOptions` 下载文件，返回 `Promise<void>`；空 URL 会触发 `onError` 并抛错。

## 浮层顺序

- `nextZIndex()`：返回递增的浮层层级值。
- `resetZIndex()`：重置为基准值，适用于测试或登出清理。
