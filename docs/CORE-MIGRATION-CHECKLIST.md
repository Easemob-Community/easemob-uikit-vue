# `@easemob/uikit-core` 抽核迁移判定清单（P1 交付物）

> 状态：**已评审通过**（2026-08-15 独立复核：8 类门禁全绿、对外 API 零回归（OLD 416 导出名缺失 0）、UMD globals / 双版本校验 / workspace:^ / log 文件名前缀 / 新文件 lint / demo theme alias 6 项评审问题已修复，详见 TECH-DEBT D97 进度）。对应 [CHATROOM-UIKIT-DESIGN.md](CHATROOM-UIKIT-DESIGN.md) P1。
> 判定依据：`packages/uikit-im/src` 全量内部 import 矩阵（机械提取，非人工印象）。
> 评审通过后按设计文档 P1 顺序逐层迁移，**每移一层跑一次门禁**，本清单逐项勾选。

## 判定原则

- 只依赖通用能力（client / user-info / presence / theme / locale / constants / 通用 utils）的进 **core**。
- 依赖会话 / 通讯录 / 群组 / 消息 domain 或 store 的留 **uikit-im**。
- 依赖类型可注入解耦、且两场景都需要的，**解耦后进 core**（见「结构性解耦项」）。

## 一、结构性解耦项（迁移前必须定论的耦合点）

### J1. `use-uikit` / `composables/types.ts` 是全局耦合点（最大风险项）

现状：`use-uikit.ts` import 全部 8 个 store + `sdk/event/registry` + message 相关 utils；`use-client` / `use-user-info` / `use-own-user-info` / `use-presence` / `use-blocklist` 全部经 `use-uikit` 取上下文。

**判定**：拆分为两层——

- **core**：`useUIKitContext`（或保留 `use-uikit` 名字，实施时定）只承载 client / theme / user-info / presence store + 连接级事件；`composables/types.ts` 的 context 类型同步拆分。
- **uikit-im**：保留 `use-uikit` 对外签名不变，内部组合 core context + conversation/contact/group/message store。

不解耦的后果：core 的 `useClient`/`useUserInfo` 会把单群聊 store 全链进聊天室 bundle，抽核失效。

### J2. `sdk/event/registry.ts` + `sdk/event/types.ts` 留 uikit-im

`registry.ts` 硬编码单群聊全部 handler；`event/types.ts` import 全部场景 store。按设计文档「复审修正 1」：core 只保留连接级事件（`connection-events.ts`）+ notice 工具 + 注册原语；`registerEventHandlers` 对外签名在 uikit-im 原样保留。

### J3. `sdk/notification-engine.ts` 留 uikit-im（实施修正，推翻原判定）

实施时核实：`notifyOnNewMessage` 整体是单群聊策略函数（读 `stores.conversation.currentConversationId`/`conversationList`、依赖 message-adapter 与 `resolve-last-message-text`），不是可通用的引擎。**真正进 core 的是通知机制**（`useNotification` composable + notification 组件 + `emitNotificationDelivered`，随 composables/组件步骤迁移）；策略函数留 uikit-im，聊天室自行实现房间通知策略。

### J4. `UserCard` 拆分：展示件进 core，操作件留 uikit-im

- `user-card.vue`：纯展示、零内部依赖 → **core**。
- `user-card-modal.vue`：依赖 `use-blocklist`（通讯录 domain）→ **留 uikit-im**。聊天室成员卡片由 chatroom 包按需自建（MemberCell 级别即可），不为复用强解 blocklist。

### J5. notice 工具（`sdk/event/notice-utils.ts`）进 core

仅依赖 constants/locale，产出消息形对象但不写 message store → core。聊天室系统通知流直接复用（设计文档 5.7）。

## 二、sdk 层

| 模块 | 判定 | 依据 |
|---|---|---|
| `sdk/client.ts`（ManagerHost/SdkChatClient） | **core** | 仅依赖 utils；P1 增量注册 ChatRoomManager |
| `sdk/types.ts`、`sdk/types/message.ts` | **core** | wire 类型，两场景共用 |
| `sdk/adapter/conversation-adapter.ts`、`message-adapter.ts` | uikit-im | 会话/消息 domain |
| `sdk/adapter/contact-adapter.ts`、`group-adapter.ts` | uikit-im | 通讯录/群组 domain |
| `sdk/domain/user-info-domain.ts` | **core** | user-info 共用（依赖 store/user-info，随 core） |
| `sdk/domain/presence-domain.ts` | **core** | presence 共用 |
| `sdk/domain/contact-/conversation-/group-/message-domain.ts` | uikit-im | 场景 domain |
| `sdk/event/connection-events.ts` | **core** | 连接级事件 |
| `sdk/event/notice-utils.ts` | **core** | 见 J5 |
| `sdk/event/registry.ts`、`types.ts`、`chat-/contact-/group-/presence-events.ts` | uikit-im | 见 J2；presence-events 的 handler 注册随 registry 留 uikit-im（presence domain 在 core，handler 绑定在场景包） |
| `sdk/notification-engine.ts` | **core（解耦后）** | 见 J3 |
| `sdk/index.ts` | 拆分 | core 导出 client/domain 基座/connection-events/notice-utils；uikit-im 导出 adapter/registry 等 |

## 三、store 层

| store | 判定 | 依据 |
|---|---|---|
| `client.ts` | **core** | 连接状态 |
| `theme.ts` | **core** | 主题（含 avatarShape），零依赖 |
| `user-info.ts` | **core** | 用户属性共用 |
| `presence.ts` | **core** | 在线状态共用 |
| `conversation.ts` / `contact.ts` / `group.ts` / `message.ts` | uikit-im | 场景状态 |

## 四、composables 层

**进 core**（domain 无关，或仅依赖 core 能力）：

- `use-client` / `use-theme` / `use-user-info` / `use-own-user-info` / `use-presence` / `use-notification` / `use-toast`
- H5 通用：`use-h5-adaptation` / `use-keyboard` / `use-long-press` / `use-pull-refresh` / `use-viewport` / `use-bottom-sheet` / `use-ripple`
- 通用交互：`use-key-bindings` / `use-resizable` / `use-uikit-storage`
- 拆分后的 core 版 `use-uikit`（见 J1）

**留 uikit-im**（场景逻辑）：

- 消息链：`use-chat` / `use-message` / `use-message-actions` / `use-message-history` / `use-message-search` / `use-message-send` / `use-quote`
- 场景实体：`use-contact` / `use-contact-filter` / `use-contact-group` / `use-contact-sort` / `use-conversation` / `use-conversation-tabs` / `use-group` / `use-group-filter` / `use-group-sort` / `use-blocklist` / `use-invite-persistence`
- 扩展点：`use-chat-plugin`（依赖 modules/chat/types）
- `use-pinyin`（仅服务通讯录/群组排序）

## 五、components 层（原子组件）

**进 core**：action-sheet、avatar、badge、button、cell、copyable-text、emoji-picker、empty、icon、icon-button、image-viewer、input、modal、notification（含 container/types）、popup、presence-avatar、presence-selector（含 modal/popup）、resizable、scroll-to-top、status-banner、toast、**user-card（仅展示件，见 J4）**

依据：这些组件的内部依赖全部落在「core 判定区」（store/theme、use-ripple、use-toast、use-presence、use-client、use-key-bindings、utils/download/z-index、locale、constants）。

**留 uikit-im**：group-card + group-card-modal（群组 domain）、user-card-modal（见 J4）。

## 六、containers / utils / theme / locale / constants

| 项 | 判定 | 备注 |
|---|---|---|
| `containers/uikit-provider` | **core** | Provider 生命周期；uikit-im re-export 保持兼容 |
| 其余 7 个 containers | uikit-im | 场景容器 |
| `utils/`：download / format-time / linkify / log-store / logger / sdk-error / sdk-log-capture / z-index / index | **core** | 通用；log-store 实施时随迁（sdk-log-capture 与其互相 import，它是零 UIKit 依赖的通用 IndexedDB 内核） |
| `utils/`：logger-binding | uikit-im | glue 层，import 指向 core |
| `utils/`：format-message / mention / resolve-last-message-text / stream-message | uikit-im | 消息场景（mention 依赖 modules/chat/types） |
| `theme/`、`locale/`（含 P1 新增 `extendLocale`）、`constants/` | **core** | 整体迁移（constants/locale 已随 Step 1 先行迁入） |
| `resolver.ts` / `auto-imports.ts` | 各包一份 | 按「工具链防复制」参数化生成，不共享源码 |
| `histoire-setup.ts` / story 体系 | 随组件归属 | 进 core 的组件 story 一并迁移 |

## 七、迁移顺序（对设计文档 P1 的展开）

1. [x] sdk 层 + 4 个 core store + constants/locale/3 utils + composables/types（**Step 1 已完成，2026-08-15，7 门禁全绿**）：client/types/domain 基座（user-info/presence）/connection-events/notice-utils → core；**ManagerHost 已增量注册 ChatRoomManager**。实施注记：① constants/locale 为零依赖模块随本步先行（原排第 6 步）；② `connection-events`/`notice-utils` 对 `RootStores` 的依赖在 core 侧改为最小结构接口 `ConnectionEventStores`/`NoticeStores`（uikit-im 的 RootStores 结构兼容，调用零改动）；③ uikit-im 桶文件一律**显式具名 re-export** core 符号（不用 `export *`，避免对外 API 被意外扩大）；④ demo/docs vite.config 补了 `__EASEMOB_UIKIT_CORE_VERSION__` define；core client 版本宏同步改名。
2. [x] J1：`use-uikit` 拆分（**Step 2 已完成，2026-08-15，8 门禁全绿**）：core 新增 `composables/use-uikit.ts`（`useCoreUIKitProvider`/`useCoreUIKit`/`CORE_UIKIT_CONTEXT_KEY`/`CoreUIKitContext`/`CoreStores`）+ `use-h5-adaptation`/`use-keyboard` 随迁；uikit-im `useUIKitProvider` 组合 core 版，公开签名不变。实施注记：① 场景挂钩最终签名 `onClientSetup?: (client: UIKitClient, coreStores: CoreStores) => (() => void) | void`，core 在 createClient + setAppKey + userInfo.listen() 之后调用，dispose 随重新初始化/logout/scope dispose 触发；② uikit-im 侧将 core 的 auto-init 一律置 false、拿到 coreCtx 后显式 `init()`——避免 onClientSetup 闭包在同步立即初始化时引用未返回的 coreCtx（features 代理）；③ uikit-im 的 h5/keyboard 两文件删除，`composables/index.ts` 改为显式具名 re-export core 符号；④ logout 顺序语义保持：core 清 client/presence/userInfo，uikit-im 追加场景 4 store + resetMultiSelectState/clearAllDrafts
3. [x] composables（第四节 core 清单）→ core（**Step 3 已完成，2026-08-15，8 门禁全绿**）：13 个共享 composable（use-client/use-theme/use-presence/use-toast/use-notification + H5 通用 use-long-press/use-pull-refresh/use-viewport/use-bottom-sheet/use-ripple + 通用交互 use-key-bindings/use-resizable/use-uikit-storage）+ `components/notification/types.ts` 迁入 core；注入点 `useUIKit()` → `useCoreUIKit()`（use-client/use-presence/use-viewport/use-uikit-storage 四处，use-viewport 保留 Provider 外 try/catch 降级）；uikit-im 桶文件显式具名 re-export 保持对外 API 不变，内部引用一律直指 `@easemob/uikit-core`。实施注记：① **use-user-info/use-own-user-info 未迁**——两者 `displayName`/`avatarUrl` 依赖场景 `stores.contact`（备注优先级兜底），属 core 判定区外，按规则留 uikit-im；**P1 收尾已按 D98 方向①解决**：core 新增无 contact 耦合的 useUserInfo/useOwnUserInfo（aux 白名单 19 hook），uikit-im 两文件改薄包装叠加 contact 兜底，对外签名不变（D98 已归档）；② use-key-bindings 的 story 留 uikit-im（core 未配 Histoire，story 体系随 Step 4 组件一并处理），import 改指 core；③ `NotificationItem` 类型经 core `components/notification/types.ts` 承载，uikit-im `components/index.ts` 改为从 core re-export；④ 通知/toast/快捷键开关均为模块级单例，迁 core 后全仓仍共享同一实例（uikit-im 统一经 `@easemob/uikit-core` 引用）。
4. [x] 原子组件（第五节 core 清单，含 story）→ core（**Step 4 已完成，2026-08-15，10 门禁全绿**）：24 个原子组件目录（含 .story.vue、emoji-picker/types、status-banner/types）+ `assets/icons` 整树 + icon 工具链 5 脚本 + `src/theme/index.css`（539 行变量）迁入 core；core 新增 histoire 体系（config/setup/`story:dev`/`story:build`）。实施注记：① **utils/download + z-index 随本步提前迁**（popup/image-viewer 依赖，原排第 5 步），uikit-im `utils/index.ts` 显式具名 re-export 保持对外 API 不变；② uikit-im 内部 68 文件 177 条组件 import 经 codemod（`tmp/rewrite-component-imports.mjs`）改为 `import { EmX as 原名 } from '@easemob/uikit-core'`，本地命名不变、模板零改动；③ `assets/images/**`（presence/reactions/gifts/misc png）全仓**无运行时代码引用**（仅 modules catalog.json 清单文档提及），整树留 uikit-im 未迁；④ presence-avatar 注入点 `useUIKit()` → `useCoreUIKit()`，其 story 改用 story 内联 `CoreProviderStub`（直接调 `useCoreUIKitProvider`，auto-init=false）——core 的 Provider 容器第 6 步才迁；⑤ theme 入口方案：uikit-im `src/theme/index.css` 只留 `@import '@easemob/uikit-core/theme'`，**相对路径直连 core src 在 vite css @import 解析下不可行**（相对 id 解析失败回退 cwd 拼路径），最终经 uikit-im vite/histoire 配置的 alias 把该 subpath 指向 core 源文件（构建不依赖 core dist 先产出；外部消费者走 package exports → core dist），已验证 uikit-im dist/theme/index.css 完整内联 539 行变量；⑥ icon 脚本参数化：`check-icon-refs.mjs [scanPkgRoot] [iconsDir]`，core 构建前置默认自检，uikit-im 以 `node ../uikit-core/scripts/check-icon-refs.mjs . ../uikit-core/src/assets/icons` 复用同一脚本（防复制）；flatten-icons/find-unused-icons/scan-lucide-icons/generate-fluent-emoji-map 同迁入 core 并加包根参数；⑦ scan-lucide-icons 依赖的 `vendor-lucide-icons.mjs` 本就不在库内（迁移前已不可跑），迁后改为缺失时告警降级而非直接崩；⑧ icon-map.ts 顶部补 `/// <reference types="vite/client" />`——demo vue-tsc 经 tsconfig paths 把 core src 纳入程序但自身无 vite/client types；⑨ story 数：core 24（含 use-key-bindings.story 自 uikit-im composables 迁入）/ uikit-im 44（原 68）；⑩ core barrel 新增导出 ActionSheetItem/UserCardAction/UserCardInfoRow 三个内部具名类型（uikit-im user-card-modal 等内部使用，原未进 uikit-im 公开桶）；uikit-im 公开 API（Em* 组件集、componentList、utils 导出名）保持不变
5. [x] theme/locale/utils 收尾（**Step 5 已完成，2026-08-15，6 门禁全绿**）：theme 变量已随 Step 4 提前迁入；utils 收尾完成（format-time/linkify → core，uikit-im `utils/index.ts` 具名 re-export，唯一直接引用点 text-message.vue 改指 core）。实施注记：**`extendLocale` 需求由既有 `mergeLocaleMessages(locale, msgs)` 覆盖**——Step 1 迁 locale 时发现该合并 API 已存在且经 core `export * from './locale'` 导出；复审修正 4 的三个关注点现状：① 冲突策略=同 key 后者覆盖（注释已文档化）；② 响应式 OK（`t()` 调用时读 messages，合并即时生效，切语言走 currentLocale ref）；③ `LocaleMessages` 是开放 `[key: string]: string` record，扩展 key 不破类型。chatroom 包届时直接 `mergeLocaleMessages('zh-CN', { 'chatroom.*': ... })` 即可，无需新增 API。
6. [x] `containers/uikit-provider` → core（core 新增 EmUIKitProvider；uikit-im 保留自己的容器，公开 API 不变）（**Step 6 已完成，2026-08-15，9 门禁全绿**）：core 新增 `containers/uikit-provider/uikit-provider.vue`（setup 调 `useCoreUIKitProvider` 只建 core context；props=核心子集 appKey/sdkConfig/autoInit/theme/locale/animation/h5/dataSource/noticeConfig/enableToast/notification/logger/onToken* + features 相关开关透传（core 不解释语义）+ 可选 `onNotificationClick`）+ 共享副作用 composable `composables/use-provider-side-effects.ts`；uikit-im provider 保留原地，对外 props/行为完全不变，场景无关 watch 全部改走共享 composable，本组件只留场景增量（通知跳会话 + isLoggedIn 拉黑/好友 watch）。实施注记：① `useProviderSideEffects(options)` 承接 theme 应用（applyThemeConfig/resolveFontSize/theme watch/animation/h5.fontScale 兼容/safeArea watch/setLocale）+ notification watch + logger watch，返回 `toastProps/enableNotification/notificationState/closeNotification/handleNotificationClick` 供两个 Provider 模板直接绑定；options 各字段为 `MaybeRefOrGetter`（Provider 传 getter 保持 props 响应式）；② 通知点击收敛为统一入口 `handleNotificationClick`：先 `window.focus()`，`navigateOnClick=false` 时仅聚焦不触发业务回调（浏览器通知 clickHandler 同步置 null，与 uikit-im 原语义逐点一致）；uikit-im 经 `onNotificationClick` 位注入既有跳会话函数（enter + sendChannelAck），core 未传时默认仅聚焦；③ `createUserInfoSubscriptionErrorHandler(enableToast)` 把「用户资料订阅无权限 → 内置 Toast」接线一并下沉 core（toast 在 core），两 Provider 共用；④ uikit-im `ProviderProps` 接口逐字保留（docs gen:api 直接解析该文件，API 表零变化），`ThemeFontSize` 本地定义保留，core 侧同名类型独立定义于 use-provider-side-effects；⑤ story：原 uikit-im provider story 全量随迁 core（11 variants 均只依赖 core 能力，直接渲染 core Provider，无需 CoreProviderStub），uikit-im 保留 2 variants 冒烟 story（场景容器挂载验证）；story 数 core 25 / uikit-im 44；⑥ core 新增导出：containers 桶 `EmUIKitProvider`/`CoreProviderProps`，index 显式具名导出 `useProviderSideEffects`/`createUserInfoSubscriptionErrorHandler` 及 `ProviderThemeConfig`/`ProviderNotificationConfig`/`ProviderLoggerConfig`/`ProviderSideEffectsOptions`/`ThemeFontSize`；core 禁 import uikit-im 校验为空。
7. [x] uikit-im 全量 re-export 对齐 + resolver/auto-imports 参数化（**Step 7 已完成，2026-08-15，10 门禁全绿**）：① **d.ts core 引用路径修正**（Step 4 遗留）：`packages/uikit-im/vite.config.ts` 的 vite-plugin-dts 加 `aliasesExclude: ['@easemob/uikit-core']`——tsconfig paths 把 core 映射到 src，不排除时 d.ts 会把 re-export core 符号的说明符展开成 `../../uikit-core/src` 相对路径（发布即断）；修后 im dist d.ts 对 core 一律保持裸包名（类型经 workspace 符号链接 → core dist d.ts 解析，门禁顺序先 core build 后 im build 已保证）；core dist d.ts 自检无外部相对路径泄漏。② **resolver/auto-imports 参数化**（工具链防复制）：新增共享生成脚本 `packages/uikit-core/scripts/gen-aux-entries.mjs`——按各包根 `aux-entries.config.mjs`（pkgName/resolverName/importsName/prefix/scan/exclude/include/exampleComponent）参数化生成 `src/resolver.ts` + `src/auto-imports.ts`，模板与派生逻辑只此一处、各包一份产物（不共享源码）；hook 白名单派生 = 扫描 scan 入口（桶文件跟进 `export *` + 捕获跨包具名 re-export，或目录平扫）− exclude + include；`--check` 模式卡漂移（取代并删除 uikit-im `scripts/check-auto-imports.mjs`，EXCLUDED 名单迁入 uikit-im 配置）。③ **uikit-im 对外行为零变化**：生成的 `EasemobUIKitResolver`/`EasemobUIKitImports` 与旧版逐名一致（35 hook 名单 diff 为空，resolver 仅多头部生成注释），`auto-imports:check` 保留（改指共享脚本 --check），新增 `aux:gen`。④ **core 新增自己的 aux 入口**：`EasemobUIKitCoreResolver`/`EasemobUIKitCoreImports`（17 个 core 共享 hook，排除项=ripple/uikit-storage/快捷键开关/CORE_UIKIT_CONTEXT_KEY/useCoreUIKitProvider/provider 副作用装配/emitNotificationDelivered），补 `vite.aux.config.ts`、package.json exports `./resolver`+`./auto-imports`、build 链加 `--check` + aux 构建——chatroom 包（P2）直接复用。⑤ docs 站两处存量修复（Step 4 遗留，本次门禁首次跑到 docs build 才暴露）：`IconGallery.vue` 的 icon-map/icon.vue import 改指 `@easemob/uikit-core`（组件已迁 core）；`.vitepress/config.ts` 的 `ignoreDeadLinks` 由 `/packages\/uikit\//` 放宽为 `/packages\/uikit/`（原正则不匹配 `uikit-im`，guide/icons.md 仓内链接误报 dead link）。
8. [x] 验收：demo/docs/MCP 照常；`@easemob/uikit-im` 类型与构建 0 回归；core 独立可构建；聊天室能力 smoke（ChatRoomManager 可经 core client 访问）（**2026-08-15 完成，10 门禁全绿**：core/im 的 vue-tsc+build+story:build、demo typecheck+build、docs build、changelog:check）。MCP：`packages/mcp` 的 `node scripts/sync-docs.mjs` 实跑通过（27 组件/7 指南，data 无 diff）。ChatRoomManager smoke：core dist `sdk/client.d.ts` 中 `ManagerHost` 含 `readonly chatRoomManager: ChatRoomManager`、`UIKitClient` 有对应 getter；node 实际 import core dist ESM 成功（129 个导出，createClient/useClient 为 function，EmUIKitProvider 可解析，外部依赖 vue/pinia/easemob-websdk 经 workspace node_modules 解析，无浏览器 API 缺失问题）；core/im 的 dist resolver/auto-imports 产物 node 加载并调用验证通过。

每步完成跑门禁：uikit-im + core 的 `vue-tsc --noEmit`、build、demo typecheck、`changelog:check`。
