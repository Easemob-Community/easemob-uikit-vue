# useUIKitProvider

创建并提供 UIKit 上下文，是 `EmUIKitProvider` 内部使用的装配函数，适合自定义 Provider 容器。

## 导入与签名

```ts
import { useUIKitProvider } from '@easemob-community/uikit-im'

const context = useUIKitProvider(config, options)
```

## 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `config` | `CoreUIKitInitConfig` | appKey、登录信息及 SDK 适配器配置 |
| `options.adapter` | `SdkAdapter` | 可选，显式注入中立 SDK 适配器 |
| `options.autoInit` | `boolean` | 是否自动初始化；`false` 时通过 `useClient().init(config)` 延迟初始化 |
| `options.features` | `Partial<UIKitFeatures> \| ComputedRef` | 功能开关，支持响应式配置 |
| `options.dataSource` | `Partial<UIKitDataSource> \| ComputedRef` | 自定义数据源 |
| `options.noticeConfig` | `NoticeConfig \| ComputedRef` | 系统通知文案、过滤与事件开关 |
| `options.h5` | `H5AdaptationConfig` | H5 适配配置 |

## 返回值

返回并 `provide` 一个 `UIKitContext`。未显式传入适配器时，使用由 `@easemob-community/uikit-im/websdk5` 等子路径入口注册的默认适配器。

## 使用边界

普通业务直接使用 [`EmUIKitProvider`](/components/provider)，无需手动调用本函数。Domain 在 SDK 初始化前不可调用。
