# 在线状态与主题类型

## UiPresence

```ts
import type { UiPresence } from '@easemob-community/uikit-im'
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | `string` | 用户 ID |
| `status` | `'online' \| 'offline' \| 'away' \| 'busy' \| 'doNotDisturb' \| 'custom'` | 展示状态 |
| `ext` | `string?` | 自定义状态文案 |
| `lastTime` | `number?` | 最近更新时间 |

相关常量为 `PRESENCE_STATUS`，对应值类型为 `PresenceStatusValue`。

## 主题类型

`useThemeStore` 公开的主题类型包括 `ThemeMode`、`Density`、`FontSizePreset`、`AnimationConfig`、`AnimationLevel` 和 `HoverStyle`。运行时修改推荐使用 [`useTheme`](/api/composables/use-theme)，避免直接拼接 CSS 变量。
