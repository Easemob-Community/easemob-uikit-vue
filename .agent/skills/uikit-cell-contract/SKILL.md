# Cell 类组件统一约束（视觉一致性 + EmCell 基础组件）

## 触发词

- `cell` / `cell 组件` / `cell 规范`
- `列表项` / `list item` / `item 样式`
- `视觉统一` / `cell 统一`
- `导航项` / `操作行` / `信息行`

## 目标

在 `easemob-uikit-vue` 中，所有「行级列表/操作/信息单元」共享同一套视觉契约，
确保会话列表项、联系人项、群组项、群管理导航项、操作行、信息行等视觉风格一致。
**优先级：视觉统一 > 封装复用**。

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-cell-contract**。

## 1. Cell Anatomy（三段式结构）

所有 cell 类组件遵循 **leading → main → trailing** 三段式布局：

```
┌──────────────────────────────────────────────┐
│ [leading]   [main (flex:1, min-width:0)]  [trailing]
│  avatar      标题 + 副标题                  badge/arrow
│  checkbox    标签 + 计数                    action btn
│  icon        值                             time
└──────────────────────────────────────────────┘
```

- **leading**：头像 / checkbox / 图标，`flex-shrink: 0`
- **main**：`flex: 1; min-width: 0;`，内部可单行（标题+meta）或双行（标题行+副标题行）
- **trailing**：徽标 / 箭头 / 操作按钮 / 时间，`flex-shrink: 0`

## 2. CSS 变量契约（必须使用，禁止偏移）

所有 cell 的 padding / margin / 圆角 / 间距 **一律走以下变量**，由 `store/theme.ts` 运行时驱动：

```css
/* 横向内边距（rounded 风格=8px, square 风格=16px） */
padding: 0 var(--uikit-item-hover-padding-x, 16px);
/* 横向外边距（rounded 风格=8px, square 风格=0px） */
margin: 0 var(--uikit-item-hover-margin-x, 0px);
/* hover 圆角 */
border-radius: var(--uikit-item-hover-radius, 0px);
/* active 圆角 */
border-radius: var(--uikit-item-active-radius, 0px);
```

**禁止**：
- ❌ 自行写 `padding: 10px 12px` 或 `padding: 12px 16px`（绕过 hover 风格联动）
- ❌ 用 `var(--uikit-components-radius)` 做 cell 圆角（那是按钮/卡片的，不是列表项的）
- ❌ 给 cell 加 `border-radius: 8px` 硬编码

## 3. 尺寸体系

| size | 高度 | gap | 适用场景 |
|---|---|---|---|
| `compact` | 48px | 10px | 紧凑列表、选择器 |
| `normal` | 64px | 12px | 默认列表项（会话/联系人/群组） |
| `large` | 72px | 12px | 带副标题、详情页信息行 |

高度通过组件级 CSS 变量控制，允许覆盖：

```css
.uikit-cell {
  height: var(--uikit-cell-height, 56px);
}
.uikit-cell.size-compact {
  height: var(--uikit-cell-height-compact, 48px);
}
.uikit-cell.size-large {
  height: var(--uikit-cell-height-large, 64px);
}
```

对于**内容不固定**的场景（如会话项带多行摘要），使用 `autoHeight` 模式：
```css
padding: 12px var(--uikit-item-hover-padding-x, 16px);
height: auto;
```

## 4. 交互状态契约

| 状态 | 类名 | 背景色 | 圆角 |
|---|---|---|---|
| 默认 | — | `transparent` | `var(--uikit-item-hover-radius)` |
| hover | `:hover` | `var(--uikit-bg-secondary)` | `var(--uikit-item-hover-radius)` |
| active（当前选中） | `.is-active` | `var(--uikit-bg-secondary)` | `var(--uikit-item-active-radius)` |
| selected（多选已选） | `.is-selected` | — | — |
| disabled | `.is-disabled` | `transparent`（hover 不变） | — |
| pinned（置顶） | `.is-pinned` | `rgba(var(--uikit-primary-rgb), 0.04)` | `var(--uikit-item-active-radius)` |

disabled 状态：`opacity: 0.5; cursor: not-allowed;`，hover 时背景不变。

## 5. 过渡动画

**统一使用** `var(--uikit-anim-duration)` + `var(--uikit-anim-easing)`，让全局动画开关和 `prefers-reduced-motion` 生效：

```css
transition:
  background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease),
  opacity var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
```

**禁止**：`transition: background-color 0.15s`（硬编码时长绕过动画开关，见 TECH-DEBT D12）。

## 6. EmCell 组件（推荐用于新 cell）

位于 `components/cell/cell.vue`，对外导出 `EmCell`。

### Props

```ts
export interface CellProps {
  /** 是否可点击（影响 cursor 和 hover），默认 true */
  clickable?: boolean
  /** 激活状态（当前选中项） */
  active?: boolean
  /** 选中状态（多选模式） */
  selected?: boolean
  /** 禁用状态 */
  disabled?: boolean
  /** 尺寸：compact / normal / large，默认 normal */
  size?: 'compact' | 'normal' | 'large'
  /** 标题文本（便捷模式，也可用 title slot） */
  title?: string
  /** 副标题文本 */
  subtitle?: string
  /** 右侧元信息文本（计数、时间） */
  meta?: string
  /** 是否显示右侧箭头（导航项常用） */
  showArrow?: boolean
  /** 分隔线：true=bottom / false=none / 'top' / 'bottom' */
  border?: boolean | 'top' | 'bottom'
  /** 内容驱动高度（而非固定高度） */
  autoHeight?: boolean
}
```

### Emits

```ts
(e: 'click'): void
(e: 'contextmenu', event: MouseEvent): void
```

### Slots

| slot | 说明 | 优先级 |
|---|---|---|
| `leading` | 左侧（avatar/checkbox/icon） | — |
| `default` | 完全覆盖 main 区域 | > title/subtitle props |
| `title` | 自定义标题 | > title prop |
| `subtitle` | 自定义副标题 | > subtitle prop |
| `trailing` | 右侧（badge/arrow/action） | > meta/showArrow |

### 使用示例

```vue
<!-- 基础导航项 -->
<EmCell title="禁言列表" :meta="'3'" showArrow border @click="..." />

<!-- 头像列表项 -->
<EmCell title="张三" subtitle="签名：Hello World">
  <template #leading>
    <Avatar :name="'张三'" :size="40" />
  </template>
  <template #trailing>
    <Badge :count="5" />
  </template>
</EmCell>

<!-- 操作行 -->
<EmCell autoHeight border @click="clearHistory">
  <template #leading>
    <Icon name="actions/trash" :size="18" />
  </template>
  <template #default>清空聊天记录</template>
</EmCell>
```

## 7. 何时用 EmCell vs 自行实现

| 场景 | 建议 |
|---|---|
| 新增列表项 / 导航项 / 操作行 / 信息行 | **用 EmCell** |
| 会话列表项（复杂逻辑：右键菜单、长按、草稿、@提及） | 自行实现，但 **CSS 变量/状态/尺寸遵循本 skill** |
| 需要特殊布局（如 grid 成员网格） | 不用 EmCell，但 hover/active 视觉遵循本 skill |

**核心原则**：即使用 EmCell 不合适（如 conversation-item 这种高定制场景），也必须遵守第 2-5 节的 CSS 变量、尺寸、状态、动画契约。

## 8. 现有组件迁移指引

存量 cell 类组件存在以下不一致，应逐步收敛（见 `TECH-DEBT.md` D36）：

| 组件 | 问题 | 修复方向 |
|---|---|---|
| `conversation-item.vue` | padding 用 `12px var(...)` 而非 height 体系；transition 硬编码 | 改 `var(--uikit-anim-duration)` |
| `contact-item-default.vue` | 与 `group-item-default.vue` ~90% 重复 | 基于 `EmCell` 重构 |
| `group-item-default.vue` | 同上 | 基于 `EmCell` 重构 |
| `group-management-section.vue` | item 用 `padding: 10px 12px`，未走 `--uikit-item-hover-*` | 改用 `EmCell` 或修正 CSS 变量 |
| `chat-info-drawer.vue` action-row | 同上 | 改用 `EmCell` 或修正 CSS 变量 |
| `contact-detail.vue` info-row | 用 `border-bottom` 而非统一分隔线 | 用 `EmCell border="bottom"` |

迁移优先级：先修 CSS 变量不一致（视觉立竿见影），再逐步基于 EmCell 重构。

## 硬规则 vs 软约定

**硬规则：**

- cell 的 padding/margin/圆角 **必须** 用 `--uikit-item-hover-*` / `--uikit-item-active-*` 变量。
- transition **必须** 用 `var(--uikit-anim-duration/easing)`。
- 状态类名 **必须** 用 `.is-active` / `.is-selected` / `.is-disabled`。
- 新增 cell 类组件 **必须** 优先用 `EmCell`。

**软约定：**

- 高度变量 `--uikit-cell-height*` 允许消费方覆盖。
- `contact-item-default` / `group-item-default` 基于 `EmCell` 重构属存量收敛，非紧急。
- `conversation-item` 因复杂度高可暂不基于 `EmCell`，但 CSS 契约必须对齐。

## 反面清单

- ❌ cell 里写 `padding: 10px 12px` / `padding: 12px 16px` 硬编码 — 绕过 hover 风格联动。
- ❌ cell 里用 `var(--uikit-components-radius)` 做圆角 — 那是按钮/卡片的，不是列表项的。
- ❌ `transition: background-color 0.15s` 硬编码 — 绕过动画开关。
- ❌ 新增 cell 不用 `EmCell` 且 CSS 也不遵循本 skill 的变量契约。
- ❌ `contact-item-default` 和 `group-item-default` 继续各写一份重复的 CSS。
