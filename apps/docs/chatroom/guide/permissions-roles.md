# 权限模型与业务角色

> PC 模式（split 布局 / 管理位）的核心文档：UIKit 的权限面天花板 = SDK 原生权限模型，
> 业务角色（主播 / 老师 / 场控）由应用层自行抽象。本文先讲清楚**权限范围**，
> 再给出**业务角色抽象指南**与参考实现。

## 一、权限模型（owner / admin / member / none）

聊天室的权限由服务端判定，进房时经房间详情接口（`permissionType`）下发给客户端。
UIKit 只认识这四个权限级别，全部管理 API 与 UI 显隐都以它为准：

| 权限 | 说明 | 禁言 | 踢人 | 全员禁言 | 公告编辑 | 黑名单 | 设/移除管理员 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `owner` | 房主 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | 管理员（owner 任命） | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `member` | 普通成员 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `none` | 旁观（未进房/详情未就绪） | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**谁能管理谁**（`useChatroomMember().canManageMember(target)` 已封装）：

- owner / admin 可管理普通成员（禁言 / 踢人）；
- 只有 owner 能设 / 移除管理员（admin 不能管理 admin）；
- 房主不可被管理（`owner` 只能由服务端变更）；
- 任何人不可管理自己。

**全员禁言白名单豁免**：全员禁言时，白名单成员仍可发言（`isInAllowlist()` 可查询）。

**UI 显隐口径**：容器管理位插槽、成员面板 / 侧栏的管理操作统一按 `canManage`
（owner/admin）与 `canManageMember(target)` 门控；服务端仍做最终校验，越权操作
会以错误提示兜底——客户端显隐只是体验优化，不是安全边界。

## 二、为什么 UIKit 不内置业务角色

「主播 / 场控 / 老师 / 学生」是**业务概念**，不同产品的角色集合不同且会演化：
`anchor`、`assistant`、`客服`、`嘉宾`、`助教`、`运营`……服务端只认
owner/admin/member，任何业务角色最终都要落到这三个权限上才能执行操作。

UIKit 内置业务角色枚举会带来三个问题：

1. **服务端无法理解**：内置「anchor」只能自欺欺人地做 UI 显隐，而这种显隐
   业务用已有的 `canManage` 一行就能自己写；
2. **角色无界**：枚举一旦内置就进入「维护不完的名单」问题，加角色要发版；
3. **违背壳子哲学**：`InteractiveCard` 不预埋商品卡 / 红包卡，同理 UIKit
   不预埋「主播端」——headless 一等公民 + 插槽机制下，业务角色天然是业务层的事。

**UIKit 只做三件事**：讲清楚权限范围（本文）、补齐权限原语（`canManageMember`）、
提供与角色无关的能力壳子（split 布局 / 管理位插槽 / 成员侧栏，全部按权限门控）。

## 三、业务角色抽象指南

### 3.1 映射模式

业务角色 = **界面形态**（显示什么 UI）+ **权限预期**（落到哪个权限上），
二者正交但最终以服务端权限为准：

| 场景 | 业务角色 | 权限预期 | 界面形态 |
| --- | --- | --- | --- |
| 私域直播 | 主播（anchor） | owner | 舞台 + 管理位 + 成员管理 |
| 私域直播 | 场控（assistant） | admin | 管理位（无舞台操作） |
| 私域直播 | 观众（audience） | member | 纯净观看 |
| 小班课 | 老师（teacher） | owner / admin | 管理位 + 成员管理 |
| 小班课 | 学生（student） | member | 纯净观看 |

角色与权限不一致时（如 member 账号切到「主播」视角）：管理 UI 按权限不出现，
操作被服务端拒绝兜底——**角色层只是体验层，权限层才是事实层**。

### 3.2 参考实现（demo 层 `use-demo-role`）

```ts
// 业务侧自建（UIKit 不导出任何角色概念）
type DemoPlayerRole = 'anchor' | 'assistant' | 'audience' | 'teacher' | 'student'

const ROLE_META = {
  anchor: { label: '主播', expectedPermission: 'owner', showManage: true },
  assistant: { label: '场控', expectedPermission: 'admin', showManage: true },
  audience: { label: '观众', expectedPermission: 'member', showManage: false },
  teacher: { label: '老师', expectedPermission: 'owner', showManage: true },
  student: { label: '学生', expectedPermission: 'member', showManage: false },
} as const

function useDemoRole(initial) {
  const role = ref(initial)
  const meta = computed(() => ROLE_META[role.value])
  return { role, label: computed(() => meta.value.label), showManage: computed(() => meta.value.showManage), setRole: (r) => { role.value = r } }
}
```

页面用法：角色驱动**业务层**显隐（如管理位插槽内容按 `showManage` 渲染），
真正的操作能力仍由容器按 `canManage` 门控：

```vue
<EmChatroomContainer room-id="room123" :scene="scene">
  <!-- 管理位插槽：容器按 canManage 门控渲染，业务再按角色视角控制内容 -->
  <template #manage-actions>
    <button v-if="role.showManage" @click="publishProduct">上架商品</button>
  </template>
</EmChatroomContainer>
```

### 3.3 角色名单的持久化

「场控 / 嘉宾」这类**非房主管理员名单**建议存聊天室房间属性（KV）：
`useChatroomAttributes` 四层同步（本地缓存 + set + 变更事件 + 拉取兜底）已就绪，
业务无需自建服务端即可全房间同步：

```ts
const { prefixedKey, setAttributes } = useChatroomAttributes()
// 场控名单（业务自己的 key 契约；UIKIT 只导出前缀工具，不写死业务 key）
await setAttributes({ [prefixedKey(CHATROOM_ATTR_PREFIX.LIVE, 'operators')]: JSON.stringify(['userA', 'userB']) })
```

## 四、PC 模式接入（split 布局 + 管理位）

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{
    name: 'live',
    layout: 'split',                       // fullscreen | split | auto（按视口）
    features: { memberList: 'panel', multilineInput: true },
    panels: { memberWidth: 300 },          // 成员栏宽度（可拖拽）
    popupMode: 'auto',                     // auto | sheet | dialog
  }"
>
  <template #stage>
    <!-- 舞台区：视频 / 白板 / 商品区（业务注入） -->
  </template>
  <template #manage-actions>
    <!-- 管理操作条：仅 owner/admin 可见（按权限，不感知业务角色） -->
  </template>
</EmChatroomContainer>
```

- `layout: 'split'`：三栏 [舞台 | 消息主栏 | 成员侧栏]，成员栏宽度可拖拽；
- `layout: 'auto'`：窄视口（<768px）自动回退 H5 全屏，宽视口用 split；
- `memberList: 'panel'` 在 split 下渲染为常驻侧栏（悬停快捷操作 + 点击 / 右键菜单），
  窄视口自动退化为底部弹层；
- `popupMode`：成员 / 礼物 / 表情面板在宽视口自动居中弹窗（缺省 auto）；
- 输入条多行（textarea + Shift+Enter 换行）、Esc 关闭弹层随布局自动生效。

## 相关文档

- [双 UIKit 架构](./architecture)
- [快速开始](./quickstart)
- 仓库根目录 [CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-UIKIT-DESIGN.md)（§11 PC 模式与角色边界）
