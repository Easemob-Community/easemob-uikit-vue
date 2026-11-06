# useConversationTabs

管理会话分栏 tab 的集合与激活状态，可半接管或完全接管内置会话 tab 栏。

## 导入与签名

```ts
import { useConversationTabs } from '@easemob-community/uikit-im'

const state = useConversationTabs(options)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `options.tabs` | `ConversationTabKey[]` | 全量分栏 | tab 集合与顺序；空数组隐藏 tab 栏 |
| `options.activeTab` | `ConversationTabKey` | `'all'` | 初始激活 tab |

## 返回值

返回 `UseConversationTabsReturn`：`tabs`、`activeTab`、`selectTab(tab)` 和 `isActive(tab)`。

## 最小用法

```ts
const { tabs, activeTab, selectTab } = useConversationTabs({
  tabs: ['single', 'group'],
})
```

将返回值绑定到会话组件 props；配合 `#tabs` 插槽可完全自定义渲染。
