# 图标

UIKit 内置一套 SVG 图标体系，由 `EmIcon` 组件统一渲染。当前内置图标已全部切换为全新一版线性图标集（24×24 画布，填充式为主），不再依赖外部图标库兜底。

## 图标体系说明

- **渲染组件**：`EmIcon`（全局注册为 `<Icon />`）。图标以 inline SVG 方式渲染，不依赖图片请求。
- **name 规则**：`name` 格式为 `分类/图标名`，与 `src/assets/icons/<分类>/<图标名>.svg` 文件路径一一对应，例如 `actions/trash` 对应 `src/assets/icons/actions/trash.svg`。构建时通过 `import.meta.glob` 自动注册，新增文件即生效，无需手工登记。
- **着色**：填充式图标使用 `currentColor` 填充，描边式图标使用 `currentColor` 描边，颜色均自动跟随 CSS `color`，天然适配主题体系；也可通过 `color` prop 显式指定。**SVG 源文件中禁止写死 `fill="black"` / `stroke="black"`**，否则深色模式下图标不会随主题反色。
- **尺寸**：通过 `size` prop 指定（单位 px，默认 20），SVG 原始 `viewBox` 会被保留，不会被裁切。

```vue
<template>
  <!-- 基础用法 -->
  <Icon name="navigation/chevron_right" />
  <!-- 指定尺寸与颜色（描边式图标） -->
  <Icon name="actions/trash" :size="18" color="var(--uikit-color-danger)" />
  <!-- 填充式图标改色需用 style color -->
  <Icon name="presence/empty" :size="16" :style="{ color: onlineColor }" />
</template>
```

> **注意**：`Icon` 的 `color` prop 对**描边式图标**生效；**填充式图标**（只有 `fill`、无 `stroke`）需要通过 `:style="{ color: ... }"` 改色。给填充式图标传 `color` prop 不会生效。

图标分类包括：`actions`（操作交互）、`arrows`（箭头方向）、`audio-video`（音视频）、`chat`（聊天消息）、`conversation`（会话列表）、`emojis-reactions`（表情）、`files-media`（文件媒体）、`gifts`（礼物）、`group-manager`（群管理）、`message-status`（消息状态）、`misc`（杂项）、`navigation`（导航）、`people`（人员）、`presence`（在线状态）、`status`（状态）。

## 图标一览

下方展示 UIKit 当前内置的全部 SVG 图标，按分类排列，设计师可直接对照使用。

<IconGallery />

## 业务图标映射

### 消息状态

己方消息发送状态使用 `message-status/*` 图标，默认映射如下：

| 状态 | 常量 | 默认图标 | 说明 |
| --- | --- | --- | --- |
| 发送中 | `MESSAGE_STATUS.SENDING` | `message-status/loading` | 旋转 loading |
| 已发送 | `MESSAGE_STATUS.SENT` | `message-status/empty` | 空心圆 |
| 已送达 | `MESSAGE_STATUS.DELIVERED` | `message-status/empty` | 空心圆 |
| 已读 | `MESSAGE_STATUS.READ` | `message-status/checked` | 空心圆+对勾 |
| 发送失败 | `MESSAGE_STATUS.FAILED` | `message-status/bang` | 圆圈内感叹号，可点击重发 |

PC 端发送失败图标 hover 时会放大 `1.2` 倍并切换为 `message-status/retry`（重发箭头）；H5 直接点击感叹号触发重发。颜色上失败状态使用 `--uikit-danger-color`，已读状态使用 `--uikit-primary-color`，其余跟随 `--uikit-text-secondary`。

群聊已读回执激活时，状态区域会切换为「已读人数圆圈」：全部已读时显示 `message-status/checked` 图标，否则显示已读人数数字。

### 在线状态

`PresenceSelector` / `PresenceAvatar` 使用 `presence/*` 图标，颜色与多端常量对应：

| 状态 | 常量值 | 图标 | 颜色变量 | 默认色 |
| --- | --- | --- | --- | --- |
| 在线 | `Online` | `presence/empty` | `--uikit-presence-online-color` | `#6CE191` |
| 离线 | `Offline` | `presence/empty` | `--uikit-presence-offline-color` | `#454545` |
| 离开 | `Away` | `presence/clock` | `--uikit-presence-away-color` | `#B9BBC5` |
| 忙碌 | `Busy` | `presence/equals` | `--uikit-presence-busy-color` | `#ED7587` |
| 勿扰 | `Do Not Disturb` | `presence/minus` | `--uikit-presence-dnd-color` | `#EE798C` |
| 自定义 | `Custom` | `presence/star` | `--uikit-presence-custom-color` | `#F3C850` |

> 在线状态常量发布时须与多端保持一致：`Online`、`Offline`、`Away`、`Busy`、`Do Not Disturb`、`Custom`。

## 操作图标交互约束

业务中所有“操作类图标按钮”（关闭、返回、`+`、设置、编辑、删除等）必须统一使用 `IconButton` 组件，禁止自行用 `<button>` + `<Icon>` 实现。详细约束见：[UIKIT UI 交互约束](../../packages/uikit-im/docs/UI_CONVENTIONS.md)。

核心原则：

- 关闭按钮统一使用 `actions/close`，由 `Popup` 的 `show-close` 或 `IconButton` 渲染。
- 返回按钮统一使用 `arrows/arrowto` 或 `navigation/chevron_left`。
- 添加按钮统一使用 `actions/plus`。
- 默认 `variant="ghost"`、`size="small"`，统一圆角背景 hover，不手写 hover 样式。

## 覆盖与新增图标

**替换已有图标**：直接用同名 SVG 文件覆盖 `src/assets/icons/<分类>/<图标名>.svg` 即可，所有 `name` 引用不变，无需改动任何业务代码。建议使用 24×24 viewBox、`currentColor` 着色的 SVG，以保证与主题体系一致。

**新增图标**：

1. 将 SVG 文件放入 `src/assets/icons/<分类>/` 目录（也可以新建分类目录）；
2. 在代码中通过 `<Icon name="分类/图标名" />` 引用即可。

构建时会自动执行 `icons:check` 校验：扫描源码中所有图标 `name` 引用并与图标库文件比对，引用不存在的图标会导致构建失败并列出缺失清单，避免图标静默不渲染。也可单独执行：

```bash
pnpm -F @easemob/uikit-im run icons:check
```

## 许可与免责声明

本 UIKit 内置图标来源为全新一版线性图标集（设计交付）。当您自行替换或新增图标时，须自行确保对所用图标素材拥有合法的使用权（包括但不限于版权授权、商标许可）；本项目不对用户自备素材的版权合规性承担任何责任。

当您自行替换或新增图标时，须自行确保对所用图标素材拥有合法的使用权（包括但不限于版权授权、商标许可）；本项目不对用户自备素材的版权合规性承担任何责任。
