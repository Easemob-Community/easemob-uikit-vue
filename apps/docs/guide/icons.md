# 图标

UIKit 内置一套 SVG 图标体系，由 `EmIcon` 组件统一渲染。当前内置图标包含：

- **线性图标（V2）**：`packages/uikit-core/src/assets/icons-v2/`，命名与设计师 svg 文件名 1:1。
- **面性图标（Filled）**：`packages/uikit-core/src/assets/icons-filled/`，命名带 `filled/` 前缀，目前主要用于在线状态等需要实心图形的场景。

不再依赖外部图标库兜底。

## 图标体系说明

- **渲染组件**：`EmIcon`（全局注册为 `<Icon />`）。图标以 inline SVG 方式渲染，不依赖图片请求。
- **name 规则**：`name` 与资源目录下的 `<路径>.svg` 文件一一对应。例如 `chevron/down` 对应 `icons-v2/chevron/down.svg`，`filled/circle/empty` 对应 `icons-filled/filled/circle/empty.svg`。构建时通过 `import.meta.glob` 自动注册，新增文件即生效，无需手工登记。
- **着色**：图标统一使用 `currentColor`（填充式 path `fill="currentColor"`，描边式 path `stroke="currentColor"`），颜色跟随 CSS `color`，天然适配主题体系；也可通过 `color` prop 显式指定。**SVG 源文件中禁止写死 `fill="black"` / `stroke="black"`**，否则深色模式下图标不会随主题反色。
- **尺寸**：通过 `size` prop 指定（单位 px，默认 20），SVG 原始 `viewBox` 会被保留，不会被裁切。

```vue
<template>
  <!-- 基础用法 -->
  <Icon name="chevron/right" />
  <!-- 指定尺寸与颜色 -->
  <Icon name="trash" :size="18" color="var(--uikit-color-danger)" />
  <!-- 语义色 -->
  <Icon name="circle/bang" :size="16" type="danger" />
  <!-- 面性图标（在线状态示例） -->
  <Icon name="filled/circle/empty" :size="10" color="#6CE191" />
</template>
```

线性图标常见顶层分类包括：`arrow`（箭头）、`audio-video`（音视频）、`bell`（通知）、`bubble`（气泡）、`camera`（相机）、`check`（勾选）、`chevron`（折角箭头）、`circle`（圆圈状态）、`file`（文件类型）、`folder`（文件夹）、`mic`（麦克风）、`person`（人员）、`pin`（置顶）、`rect`（矩形容器内的图形）、`search`（搜索）、`shield`（权限）、`speaker`（扬声器）、`trash`（删除）、`xmark`（关闭）等。

## 图标一览

下方展示 UIKit 当前内置的全部 V2 SVG 图标，按目录分类排列，点击即可复制名称。

<IconGallery />

## 业务图标映射

### 消息状态

己方消息发送状态使用如下图标：

| 状态 | 常量 | 默认图标 | 说明 |
| --- | --- | --- | --- |
| 发送中 | `MESSAGE_STATUS.SENDING` | `loading/arc/normal` | 旋转 loading |
| 已发送 | `MESSAGE_STATUS.SENT` | `circle/empty` | 空心圆 |
| 已送达 | `MESSAGE_STATUS.DELIVERED` | `circle/empty` | 空心圆 |
| 已读 | `MESSAGE_STATUS.READ` | `circle/checked` | 圆圈内对勾 |
| 发送失败 | `MESSAGE_STATUS.FAILED` | `circle/bang` | 圆圈内感叹号，可点击重发 |

PC 端发送失败图标 hover 时会放大 `1.2` 倍并切换为 `ringarrow/cw`（重发箭头）；H5 直接点击感叹号触发重发。颜色上失败状态使用 `--uikit-danger-color`，已读状态使用 `--uikit-primary-color`，其余跟随 `--uikit-text-secondary`。

群聊已读回执激活时，状态区域会切换为「已读人数圆圈」：全部已读时显示 `check/double` 图标，否则显示已读人数数字。

### 在线状态

`PresenceSelector` / `PresenceAvatar` 使用 `presence/*` 图标（该组为 PNG 位图，不纳入 SVG 图标库），颜色与多端常量对应：

| 状态 | 常量值 | 图标 | 颜色变量 | 默认色 |
| --- | --- | --- | --- | --- |
| 在线 | `Online` | `filled/circle/empty` | `--uikit-presence-online-color` | `#6CE191` |
| 离线 | `Offline` | `filled/circle/empty` | `--uikit-presence-offline-color` | `#454545` |
| 离开 | `Away` | `filled/circle/clock` | `--uikit-presence-away-color` | `#B9BBC5` |
| 忙碌 | `Busy` | `filled/circle/equals` | `--uikit-presence-busy-color` | `#ED7587` |
| 勿扰 | `Do Not Disturb` | `filled/circle/minus` | `--uikit-presence-dnd-color` | `#EE798C` |
| 自定义 | `Custom` | `filled/circle/star` | `--uikit-presence-custom-color` | `#F3C850` |

> 在线状态常量发布时须与多端保持一致：`Online`、`Offline`、`Away`、`Busy`、`Do Not Disturb`、`Custom`。

## 操作图标交互约束

业务中所有“操作类图标按钮”（关闭、返回、`+`、设置、编辑、删除等）必须统一使用 `IconButton` 组件，禁止自行用 `<button>` + `<Icon>` 实现。详细约束见：[UIKIT UI 交互约束](../../packages/uikit-im/docs/UI_CONVENTIONS.md)。

核心原则：

- 关闭按钮统一使用 `xmark/light`，由 `Popup` 的 `show-close` 或 `IconButton` 渲染。
- 返回按钮统一使用 `chevron/left`。
- 添加按钮统一使用 `plus`。
- 默认 `variant="ghost"`、`size="small"`，统一圆角背景 hover，不手写 hover 样式。

## 覆盖与新增图标

**替换已有图标**：直接用同名 SVG 文件覆盖 `packages/uikit-core/src/assets/icons-v2/<路径>.svg`（线性）或 `packages/uikit-core/src/assets/icons-filled/filled/<路径>.svg`（面性）即可，所有 `name` 引用不变，无需改动任何业务代码。建议使用 24×24 viewBox、`currentColor` 着色的 SVG，以保证与主题体系一致。

**新增图标**：

1. 线性图标放入 `packages/uikit-core/src/assets/icons-v2/<目录>/`（目录层级即 `name` 前缀）；
2. 面性图标放入 `packages/uikit-core/src/assets/icons-filled/filled/<目录>/`（`name` 自动带 `filled/` 前缀）；
3. 在代码中通过 `<Icon name="目录/文件名" />` 引用即可。

构建时会自动执行 `icons:check` 校验：扫描源码中所有图标 `name` 引用并与图标库文件比对，引用不存在的图标会导致构建失败并列出缺失清单，避免图标静默不渲染。也可单独执行：

```bash
pnpm -F @easemob/uikit-im run icons:check
```

## 许可与免责声明

本 UIKit 内置图标来源为设计师交付的线性图标集。当您自行替换或新增图标时，须自行确保对所用图标素材拥有合法的使用权（包括但不限于版权授权、商标许可）；本项目不对用户自备素材的版权合规性承担任何责任。
