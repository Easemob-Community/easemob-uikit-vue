# 三包架构的包归属判定（core / uikit-im / uikit-chatroom 边界）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-package-boundary**。

## 触发词

- `新功能放哪` / `进 core 吗` / `core 还是 im` / `包归属` / `包边界`
- `加 store / composable / 组件 / utils / domain 放哪个包`
- `core 加什么` / `core 里有什么` / `core 隔离`
- `场景包` / `chatroom 复用` / `两包共用`

## 目标

新增/修改功能时避免四类翻车：

1. **core 反向依赖场景包**——把 `@easemob/uikit-im` 的 store/domain import 进 core，
   聊天室场景 bundle 会把单群聊代码全链进来，抽核失效（门禁：`scripts/check-core-isolation.mjs`）；
2. **core 膨胀成杂货铺**——core 是 1.0.0 公共包，往里加导出 = 扩公共 API 面
   （semver 义务），单场景独享的东西进 core 只会让两个场景包都背着它；
3. **场景包之间互相依赖**——chatroom 依赖 im 的代码，导致聊天室必须带单群聊；
4. **「看似通用」误判**——文案、枚举、工具函数里混着场景语义
   （如 `conversation.*` 文案、群成员角色），直接写进 core 后场景包无法拆分。

## 1. 三包结构与依赖方向（先背这个）

```
uikit-im（单聊/群聊场景）──┐
                           ├──►  uikit-core（共享基座，1.0.0）──►  easemob-websdk / vue / pinia
uikit-chatroom（聊天室）───┘
```

- **依赖方向只有一条**：场景包 → core；core 不得依赖任何场景包（含注释级自觉，
  门禁脚本拦截 import）；场景包之间互不依赖。
- core 被场景包经裸 specifier（`@easemob/uikit-core`）引用；core 内禁止 `../uikit-im` 这类相对越界。
- 场景包通过 **core 提供的注入点**拿场景能力（先例：im 经 `useCoreUIKitProvider` 的
  `onClientSetup` 注册场景事件、`clientName`/`clientVersion` 注入版本日志）。

## 2. 归属判定决策树（新功能默认走这里）

```
第 1 步 功能类型：store / composable / 组件 / utils / domain / event / 常量 / locale 文案？
第 2 步 依赖面：是否 import 场景 domain/store（conversation / contact / group / message /
              blocklist / 场景 modules）？
        ├─ 依赖了 → 默认留场景包（跳到第 4 步判断能否解耦）
        └─ 没依赖（只碰 vue / websdk / core 自身能力）→ 进第 3 步
第 3 步 复用性：core / im / chatroom 谁需要？
        ├─ 仅一个场景需要 → 留该场景包（哪怕代码很通用）
        ├─ ≥2 场景需要，或纯通用层（SDK 抽象 / 基础交互）→ 进 core
        └─ 不确定 → 默认留场景包，等第二个场景真用到了再上提（上提成本低）
第 4 步 解耦判断（仅当「两场景都需要但依赖场景 store」时）：
        ├─ 场景依赖可经参数/回调注入（options / onClientSetup 模式）且核心逻辑场景无关
        │   → 解耦后进 core（先例：J1 use-uikit 拆分、D98 useUserInfo 去 contact 耦合）
        └─ 强耦合无法注入 → 各场景包各自实现，不为复用硬解（先例：J4 UserCard
            展示件进 core、操作件 user-card-modal 留 im）
```

**默认倾向：先留场景包。** 进 core 需要理由（≥2 场景复用或纯通用），不进 core 不需要理由。

## 3. core 已含 / im 已含（P1 现状，新增前先查这里避免重复搬）

**core（`packages/uikit-core/src`）**：

- sdk 基座：`sdk/client.ts`（`UIKitClient` / `ManagerHost`，含 `chatRoomManager`）、
  `sdk/types*`（wire 类型）、`sdk/domain/user-info-domain.ts`、`presence-domain.ts`、
  `sdk/event/connection-events.ts`、`sdk/event/notice-utils.ts`
- store：`client / theme / user-info / presence`
- composables：`useClient / useTheme / useUserInfo / useOwnUserInfo / usePresence /
  useToast / useNotification / useH5Adaptation / useKeyboard / useLongPress /
  usePullRefresh / useViewport / useBottomSheet / useRipple / useKeyBindings /
  useResizable / useUIKitStorage / useCoreUIKitProvider / useCoreUIKit /
  useProviderSideEffects`
- 24 个原子组件（`components/`，Em* 基础件）+ theme CSS 变量 + `locale/` + `constants/`
- utils：`logger / log-store / sdk-log-capture / sdk-error / download / z-index /
  format-time / linkify`
- 容器：`EmUIKitProvider`

**im（`packages/uikit-im/src`）**：

- store：`conversation / message / contact / group`；domain/adapter 对应四域 + 事件
  （`sdk/event/registry.ts` 及 chat/contact/group/presence-events）
- 容器：7 个场景容器（chat / conversation / contact / address-book / contact-list /
  group-list）+ `useUIKitProvider`（组合 core 版）
- modules（聊天/通讯录/会话/群组业务块）、tiptap 编辑器
- composables：`useChat / useMessage* / useConversation* / useContact* / useGroup* /
  useBlocklist / useQuote / useChatPlugin / usePinyin / useInvitePersistence` 等场景链

## 4. 各类型功能的具体判定

| 类型 | 进 core 的条件 | 留场景包的情形 |
|---|---|---|
| store | 只碰 core 四 store 与 websdk | 碰场景四 store / 场景 modules |
| composable | 依赖面全在 core 能力内，或经注入解耦后 | 依赖场景 store/domain/插槽体系 |
| 组件 | 原子/展示件，零场景依赖（先例：UserCard 展示件） | 依赖场景 domain（group-card、user-card-modal） |
| domain/adapter | 通用实体（user-info / presence 模式） | 场景实体（conversation / group / message / chatroom） |
| event handler | 连接级（connection-events 模式） | 场景级工厂（registry.ts / 未来 registerChatroomEventHandlers） |
| 常量 | 通用枚举（消息/会话/状态/角色，现已在 core constants） | 场景专属枚举（在场景包自建局部常量文件，不进 core） |
| locale 文案 | 两场景共用的通用文案 | 场景专属文案（见 §5） |
| utils | 零 UIKit 依赖或纯通用（logger/download 模式） | 绑定场景消息/会话语义（format-message / mention / stream-message） |

## 5. locale / constants 特例（最容易误判的两处）

- **locale**：P1 把全部既有文案迁入了 core，但 `conversation.*` / `chat.*` / `group.*`
  等本质是 im 场景文案。**新增场景专属文案不得写进 core 的 zh-CN.ts / en.ts**，
  正确姿势是场景包初始化时合入：
  `mergeLocaleMessages('zh-CN', { 'chatroom.xxx': '...' })`
  （core 已导出，冲突策略 = 同 key 后者覆盖，响应式即时生效）。
- **constants**：通用枚举已全在 core `constants/index.ts`；**新增场景专属枚举**
  （如聊天室麦位状态、直播间礼物事件名）在场景包内自建常量文件，
  不要为了「统一」塞进 core constants——那会迫使另一场景包背无关枚举。

## 6. 进 core 前的自检清单（全部勾选才动手）

1. 有第二个场景的真实使用点（或属于纯通用层：SDK 抽象 / 基础交互 / 主题 / i18n 机制）；
2. `packages/uikit-im/src` 内 grep 不到该能力的场景依赖（或已解耦成注入参数）；
3. 不会把 im 的 store/domain/modules 类型带进 core 公共类型；
4. 文案/枚举属于通用层（见 §5）；
5. 加入后 core 公共导出面增量可接受（core 1.0.0 起，导出 = 契约，删改要 major）。

## 硬规则 vs 软约定

**硬规则：**

- core 禁止 import 任何场景包（`@easemob/uikit-im` / `@easemob/uikit-chatroom` /
  相对越界），门禁 `packages/uikit-core/scripts/check-core-isolation.mjs` 挂在 core build 前置；
- 场景包之间禁止互相依赖（chatroom 只允许依赖 core）；
- core 的公共导出一旦发布（1.0.0 起）删改视为 breaking，需 major 版本；
- im 侧引用 core 一律经 `@easemob/uikit-core` 裸 specifier，禁止相对路径进 core src。

**软约定：**

- 新功能默认留场景包，进 core 需满足 §6 清单；
- 场景专属文案经 `mergeLocaleMessages` 合入，不直接改 core locale 文件；
- 事件 handler 工厂跟随场景包（im 的 registry.ts 模式），core 只留连接级与 notice 工具。

## 已知漂移（改到相关文件时注意）

- 三包架构与 P1 抽核记录：根 `CHATROOM-UIKIT-DESIGN.md`（第四节边界清单）与
  `CORE-MIGRATION-CHECKLIST.md`（一次性迁移文档，判定以本 skill 为准）；
- 治理登记：`TECH-DEBT.md` D97（三包架构规划）与 D99（包边界治理：本 skill + 门禁）；
- chatroom 包（P2 起）落地后，§3 清单需补 chatroom 侧现状。

## 反面清单

- ❌ 在 core 里 `import { useConversationStore } from '@easemob/uikit-im'`——core build 门禁直接失败，聊天室 bundle 被单群聊污染；
- ❌ 把 im 独享的 composable 放进 core「反正早晚用得上」——core 公共面膨胀，且 im 内部函数混进公共 API；
- ❌ chatroom 包 import im 的消息气泡组件「省得重写」——聊天室必须背 tiptap/通讯录；
- ❌ 新场景文案直接写进 core zh-CN.ts——场景包拆不掉，两包文案互相踩 key；
- ❌ 把场景专属枚举塞进 core constants——另一场景包被迫携带无关枚举。
