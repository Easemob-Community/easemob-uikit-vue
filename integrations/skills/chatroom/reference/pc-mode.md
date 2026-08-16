# PC 模式与权限模型

私域直播开播端（PC / Electron）、小班课师生端需要 PC 交互与权限管理。
**决策：业务角色不内置**——UIKit 权限面天花板 = SDK 原生权限
（owner / admin / member / none），业务角色（主播 / 场控 / 老师 / 学生）由应用层抽象。

## split 分栏布局

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{ name: 'live', layout: 'split', panels: { memberWidth: 300 } }"
>
  <template #stage>
    <!-- 舞台：视频 / 白板 / 商品区 -->
  </template>
  <template #manage-actions>
    <button @click="publishProduct">上架商品</button>
  </template>
</EmChatroomContainer>
```

- `layout: 'split'` 三栏 [舞台 | 消息主栏 | 成员侧栏]，成员栏宽可拖拽（200~480px）；
- `layout: 'auto'` 按视口自动选择（<768px 退化为 H5 全屏）；
- 窄视口成员侧栏自动退化为 H5 底部弹层（`popupMode: 'auto'`）。

## 管理位（manage-actions 插槽）

管理操作入口放 `#manage-actions` 插槽，**按 `canManage` 门控**（与角色无关）：

```vue
<template #manage-actions="{ canManage }">
  <button v-if="canManage" @click="muteAll">全员禁言</button>
  <button v-if="canManage" @click="publishProduct">上架商品</button>
</template>
```

`features.management` 开关组控制内置管理能力显隐：
`{ mute?, kick?, muteAll?, announcement?, blocklist?, admin? }`。

## 权限原语

```ts
import { useChatroomMember } from '@easemob/uikit-chatroom'

const { canManageMember, canManage, currentRole } = useChatroomMember()
// canManageMember(target): 当前用户能否管理目标成员
// （不能管房主/自己；admin 只能由 owner 管理）
```

## 业务角色抽象（应用层）

角色最终落到 SDK 权限才能执行操作，推荐参考映射：

| 业务角色 | 权限 |
| --- | --- |
| 主播（owner） | 全部管理能力 |
| 场控 / 助教 | admin（禁言 / 踢人，不能管 owner 与其他 admin） |
| 观众 / 学生 | member |

角色名单可存**房间属性**（`useChatroomAttributes`，KV 四层同步，全房间实时可见）。

## PC 交互细节

- 成员行 hover 快捷操作（`@media (hover:hover)` 包裹，触屏不误触）；
- 右键菜单 `ChatroomContextMenu`（视口翻转 / 外部点击 / Esc 关闭）；
- 危险操作居中确认弹窗；
- 弹层退化 `popupMode: 'auto' | 'sheet' | 'dialog'`（宽视口 sheet → dialog）；
- 输入条多行（textarea + Shift+Enter 换行，`features.multilineInput`）；
- Esc 关闭弹层（`features.keyboard`）。
