# UIKIT UI 交互约束

本文档约束 UIKIT 内部可复用组件的通用交互模式，确保相同语义的元素在不同页面/弹窗/抽屉中表现一致。

## 1. 操作类图标按钮（IconButton）

### 1.1 必须使用 `IconButton` 的场景

以下操作类图标**禁止**再用自定义 `<button>` + `<Icon>` 实现，必须统一使用 `IconButton`：

- 弹窗/抽屉右上角**关闭**按钮
- 二级页/抽屉头部**返回**按钮
- 列表/卡片头部**添加**（`+`）按钮
- 头部**设置**、**编辑**、**更多**等图标操作
- 消息/单元格内部的图标操作（如复制、删除、编辑备注等）

### 1.2 默认规范

```vue
<!-- 头部/行内操作：small + ghost -->
<IconButton icon="actions/close" size="small" variant="ghost" :title="t('button.close')" />

<!-- 工具栏 emphasized 操作：medium + ghost/solid -->
<IconButton icon="actions/plus" size="medium" variant="ghost" :title="t('group.createGroup')" />
```

| 属性 | 推荐值 | 说明 |
| --- | --- | --- |
| `variant` | `ghost`（默认） | 透明背景，hover 显示统一圆角背景 |
| `size` | `small` | 28×28，适合 header/行内；`medium` 32×32 用于工具栏 |
| `type` | `default` | 危险/删除操作使用 `danger` |
| `title` | 必填 | 提供 tooltip 与可访问性标签 |

### 1.3 图标语义映射

| 操作 | 图标 name | 说明 |
| --- | --- | --- |
| 关闭 | `actions/close` | 关闭弹窗、抽屉、modal |
| 返回 | `arrows/arrowto` / `navigation/chevron_left` | 返回上一级；抽屉内建议 `arrows/arrowto`，导航返回建议 `navigation/chevron_left` |
| 添加 | `actions/plus` | 添加联系人、创建群组、添加成员等 |
| 编辑 | `actions/edit` | 编辑群名、备注等 |
| 删除/移除 | `actions/trash` / `actions/user-minus` | 按场景选择 |
| 设置 | `misc/gear` | 群管理、设置入口 |

### 1.4 禁止行为

- 禁止为单个操作图标手写 `width/height/border-radius/hover` 样式。
- 禁止用 `&times;` 文本或 emoji 代替图标关闭按钮。
- 禁止同一产品中关闭按钮一会儿在左、一会儿在右；关闭统一在右上角，返回统一在左上角。

## 2. 弹窗/抽屉关闭按钮

- 所有基于 `Popup` 的居中/底部弹窗，优先使用 `Popup` 的 `show-close` 能力，它会自动渲染符合规范的 `IconButton`。
- 自定义抽屉（如 `ChatDrawer`）的头部关闭/返回按钮，也使用 `IconButton`。
- 不要在弹窗内容里再嵌套一个额外的关闭按钮。

## 3. Hover / Active 统一

`IconButton` 已经内置统一反馈：

- `ghost` hover：圆角背景色 `var(--uikit-bg-hover)`，不位移、不添加阴影。
- active：轻微缩放 `scale(var(--uikit-bg-secondary))`。

业务侧不要覆盖这些交互，除非经过设计评审。

## 4. 危险操作

危险操作图标按钮（删除、清空记录、移出黑名单等）使用：

```vue
<IconButton icon="actions/trash" type="danger" variant="ghost" :title="t('chat.clearHistory')" />
```

- `type="danger"` 保证图标颜色与 hover 背景为危险色。
- 文字按钮危险操作使用 `Button type="danger-outline"`。

## 5. 主题与深色模式

`IconButton` 的图标使用 `currentColor`，颜色由 `type` 与 CSS 变量决定，天然跟随主题切换。业务侧不应写死颜色值。
