## @easemob/uikit-chatroom 1.0.0 (2026-08-15)


### 里程碑

- **首个稳定版（P5 文档与集成收尾）**：功能面完整（容器 / 场景预设 / PC 模式 / headless
  契约 / 弹幕流 / 直播组件集），文档站、集成 skill 与 MCP 数据齐备；自 0.3.0 起对外 API
  保持向后兼容，0.2.0 起的五变种 demo 页零回归。

### 新增

- **文档与集成（P5，设计文档 §九 P5）**：
  - `gen:api` 参数化支持聊天室包：`PACKAGES` 配置表驱动，输出隔离到
    `.vitepress/gen/chatroom/`（uikit-im 根目录零漂移）；props 查找支持同目录
    `types.ts` 声明（如 `ChatroomContainerProps`）与内联 `defineProps<{...}>()` 兜底；
  - docs 聊天室章节正式化：ChatroomContainer / 直播弹幕流 / 直播组件集（新页）/
    PC 模式组件页全部接入自动生成 API 表格，弹幕流页新增**运行 demo 块**（纯 UI 模拟数据）；
  - 聊天室集成 skill（`integrations/skills/chatroom`）：SKILL.md + quickstart /
    provider / components / danmaku / pc-mode / gotchas + 自动同步 API 明细；
    `gen-skill.mjs` 参数化双目标（IM + 聊天室）；
  - MCP 数据纳入聊天室：guide + 组件 API + manifest `chatroom` 段（独立 version），
    `search_docs` 搜索覆盖两包、`get_component_api` 兼容聊天室组件名。
- **工具链修正（P1 抽核遗留）**：`gen:api` 原子组件根目录跟随抽核迁移到
  `@easemob/uikit-core`（此前指向 `uikit-im/src/components` 会 ENOENT）；
  插槽提取增强——`name` 属性不在 `<slot` 首位的多行写法不再漏提取，
  容器 19 个命名插槽全量落表（此前仅 10 个）。
- **组件公开导出补全（文档整改自查）**：`ChatroomGiftBar`（礼物入口）与
  `ChatroomMicQueue`（语聊房麦位）此前仅模块层导出、未进包入口——补入直播组件集
  公开导出（组件文档与按需 import 可正常使用）。
- **`ChatroomGiftBar` 无 Provider 降级（文档演示修复）**：发送能力（`useChatroomMessage`）
  改为**探测式惰性获取**——先 `inject(CORE_UIKIT_CONTEXT_KEY, null)` 检测 Provider 上下文
  （带默认值不产生 inject 警告），无上下文（纯 UI 预览 / 文档演示）时降级为
  「选中仅关闭面板」预览模式，**零警告零抛错**；正常接入环境行为不变（选中即发送）。
- **`ChatroomLiveFullscreenEffect` 新增 `fullscreen?: boolean` prop**（缺省 true 向后兼容）：
  false 时动效改为铺满**最近定位祖先**（absolute + inset 0），
  服务嵌套容器 / 文档演示等需要把动效约束在局部区域的场景。

### 兼容性

- 自 0.3.0 起无公开 API 破坏性变更；`layout` 缺省 `fullscreen`、`popupMode` 缺省 `auto`、
  新增 prop / 插槽全部可选；版本号与根 CHANGELOG 同步（`changelog:check` 通过）。

---

## @easemob/uikit-chatroom 0.3.0 (2026-08-15)


### 新增

- **插槽 / props 可控性补全（P6，消费者视角反向评估，详见 docs/CHATROOM-CAPABILITY-REVIEW.md）**：
  - **隐藏 / 接管 header**：scene `features.header?: boolean`（缺省 true 向后兼容）——`header: false`
    隐藏内置 `ChatroomHeader`；`#header` 插槽提供时仍渲染（容器内接管）；完全无头时业务自绘
    头部放容器外。demo 基础聊天室 / 语聊房 / 小班课三页改用 `features.header: false`，
    消除「DemoSceneHeader + 容器内置 header」双层重合；
  - **弹幕流自定义插槽**（`ChatroomLiveDanmakuStream`）：新增 `#prefix`（scope `{ item,
    display-name }`，渲染在整条气泡最左端——左侧头像/等级/VIP 皇冠栏位直插位）、`#badge`
    （scope `{ item, display-name }`，渲染在用户名后、内容前——VIP 徽章/等级/勋章直插位）、
    `#item`（scope `{ item, display-name, display-count }`，整条覆盖内置气泡渲染，
    合并/挤出/动画仍由组件管理）、`#empty`（空态覆盖）；
    `LiveDanmakuKind` 加宽 `| (string & {})`（业务自定义 kind 类型安全透传）；`LiveDanmakuItem`
    新增 `zone?: 'notice' | 'chat'`（条目级分区覆盖，优先于 NOTIFICATION_KINDS/CHAT_KINDS 常量）
    与 `meta?: Record<string, unknown>`（业务数据透传）；`isNotificationKind`/`isChatKind`
    参数加宽为 `string`；自定义 kind 优先级回落 0（防永不被挤出）；
  - **容器插槽补全**：`#message-list`（scope `{ messages, status, history-has-more,
    loading-history, load-more }`，整块替换「加载更多 + VirtualList + 空态」，滚动/加载职责
    转移业务；提供后 message-item/message-custom/empty 自然失效）、`#terminal`（被踢/解散终态
    视图覆盖）、`#announcement-editor`（公告编辑弹窗覆盖，scope `{ show, content, save, close }`）；
  - **`ChatroomLiveTopBar` 新增 `#extra` 插槽**（more/report 之后，业务注入分享/关注/在线数等）。
- **文档**：docs `chatroom-container` 页重写（真实 props/emits/19 插槽全表 + 隐藏/重写 header
  三种形态示例 + `#message-list` 容器内弹幕示例）；新增「直播弹幕流 DanmakuStream」组件页
  （props/插槽/自定义 kind 指南/CSS token 清单）；sidebar 登记。
- **Demo**：live 页弹幕流新增 `#prefix`（左侧 👑 皇冠）、`#badge`（👑L 徽章，读
  `item.meta.vipLevel`）与 `#item`（整条自定义渲染）开关演示；`ChatroomLiveTopBar` 注入分享
  按钮示范 `#extra`；基础聊天室页新增 `#toolbar` 消息区形态切换 + `#message-list` 弹幕流接管演示。
- 类型导出：`LiveDanmakuZone` 加入公开类型面。

### 兼容性

- 全部新增项可选、默认行为不变：`features.header` 缺省 true、弹幕未提供插槽时内置渲染不变、
  容器未提供新插槽时行为与 0.2.0 一致；既有五变种 demo 页零回归。

---

## @easemob/uikit-chatroom 0.2.0 (2026-08-15)


### 新增

- **PC 模式与角色能力（P5 增量，设计文档 §11）**——角色不内置，UIKit 权限面天花板 =
  SDK 原生权限（owner/admin/member/none），业务角色由应用层抽象：
  - **权限原语上提**：`useChatroomMember.canManageMember(target)`——「当前用户能否管理
    目标成员」判定（不能管房主/自己、admin 只能由 owner 管理）从成员面板内嵌上提为公开
    API，成员面板改复用（单一实现）；
  - **split 分栏布局实现**（scene `layout: 'fullscreen' | 'split' | 'auto'`，`fullscreen`
    缺省向后兼容；auto 按视口 <768px 选择）：新 `ChatroomSplitLayout`（三栏
    [舞台 `#stage` | 消息主栏 | 成员侧栏]，成员栏可拖拽 200~480px）+ 容器 split 分支
    （`#stage` 插槽、成员侧栏、窄视口退化 H5 弹层）；
  - **管理位**：容器新 `manage-actions` 插槽（`canManage` 门控，业务注入操作台入口）+
    scene `features.management` 开关组（mute/kick/muteAll/announcement/blocklist/admin）；
  - **PC 交互**：新 `ChatroomContextMenu`（右键/点击菜单：视口翻转/外部点击/Esc 关闭）、
    新 `ChatroomMemberSidebar`（成员/黑名单 tab + 分页 + 行悬停快捷操作 + 右键菜单 +
    危险操作居中确认）、成员项 `#manage-actions` 悬停插槽（`@media (hover:hover)` 包裹）、
    `popupMode` 弹层退化（成员/礼物/表情面板宽视口 sheet→dialog，`useChatroomPopupMode`）、
    输入条多行（textarea + Shift+Enter 换行，scene `features.multilineInput`）、
    Esc 关闭弹层（scene `features.keyboard`）；
  - **新 composables**：`useChatroomLayout`（布局解析）、`useChatroomPopupMode`（弹层形态）；
  - **Demo 验收**：`apps/demo-chatroom` 新增 `src/demo-role.ts`（业务角色抽象参考实现：
    主播=owner / 场控=admin / 观众=member；老师=owner / 学生=member）+ 宽屏路由
    `#/pc-live`（开播端三栏 + 管理位 + 信令房双房商品链路）与 `#/pc-class`（双端角色
    切换），PC 路由不套 375px 手机壳（全窗口渲染）；
  - **文档**：docs「权限模型与业务角色」页（权限矩阵 + 角色抽象指南 + 名单存房间属性建议）、
    quickstart PC 接入段、PC 组件页；设计文档 §11「PC 模式与角色边界」决策落盘。

### 变更

- `ChatroomMemberItem` manage 事件携带点击事件（`(member, event)`，供 PC 菜单定位；
  组件为模块内部实现，不对外导出，事件签名变更无外部影响）；
- `ChatroomMemberPanel` / `ChatroomGiftBar` / `ChatroomInputBar` 新增 `popupMode` prop
  （缺省 sheet，行为不变）。

---

## @easemob/uikit-chatroom 0.1.0 (2026-08-15)


### 新增

- **聊天室场景包（P2 完整落地：P2-1 无头内核 + P2-2 容器/UI/demo）**：
  - sdk 层：`Chatroom` / `ChatroomMember` / `ChatroomMuteItem` / `ChatroomAnnouncement` / `ChatroomAttributes` domain 类型；`ChatroomAdapter` 薄封装 websdk `ChatRoomManager` 全量能力（进退房/成员分页/管理员/禁言（含全员）/黑/白名单/公告/房间属性 KV/房间信息）+ `ChatManager` 聊天室消息收发与历史拉取
  - 事件层：`registerChatroomEventHandlers` 注册 `chatRoomManager` 全量房间事件（成员进出/禁言/管理员/公告/属性/被踢/解散等）+ `chatManager` 消息事件（按 `conversationType === 'chatRoom'` 过滤，与单群聊互不污染），房间事件转系统通知插入消息流（复用 core notice 工具）
  - store：**按「房间注册表 `Map<roomId, RoomState>` + `activeRoomId` 活动视图」两层建模**（设计文档 §5.9，单房为其特例，P3 多房间/信令房零返工）：房间状态机（idle/joining/joined/leaving/kicked/destroyed，joinToken + roomId 双重防竞态）+ 消息流**按 roomId 分桶**（无未读/无会话/无回执；渲染列表默认封顶 200 条可配 + 接收缓冲队列按 150ms 窗口批量合并）
  - composables：`useChatroom`（join/leave/断线重连自动重进 + 进房「最近 N 条」提示）/ `useChatroomMessage`（按房发送：`sendText(text, { roomId })` 支持显式指定房间，P3 信令房契约就绪）/ `useChatroomMember`（按角色权限位）/ `useChatroomAttributes`（四层同步 + 场景前缀约定）/ `useChatroomScene`（场景预设机制与类型，内置 preset P3 落地）/ `useChatroomProvider`（不新增 Provider 概念，组合 core `useCoreUIKitProvider` + 场景 manager 注入 `[ChatManager, ChatRoomManager, UserInfoManager]`，**显式 `enableUserInfoSync: false`**——未注入 GroupManager，避免 SDK 能力校验抛错）
  - **`EmChatroomContainer` 容器（P2-2）**：三步接入（Provider + 容器 + room-id），props（room-id / scene / auto-join / history-page-size / max-messages）+ emits（back / kicked / destroyed / join-error）+ 命名插槽（header / header-title / header-extra / toolbar / message-item / message-custom / member-item / member-panel / empty / notice / input-bar）；只消费公开 composable 契约（防「第二 API 面」，headless 契约 P3 验收同内核）；场景 features 控制公告条/成员面板显隐
  - modules/chatroom：消息项（文本/图片/custom 兜底/系统通知/撤回标记）、输入条（文本+图片，发送即清空 + 列表内失败反馈）、成员面板（底部 Popup + 分页加载 + 禁言/踢人/管理员操作菜单）、成员项（角色徽章/禁言标记）、顶部栏（返回/人数/退出）、公告条；H5-first 样式（全屏 flex + 安全区）
  - demo 验证页：`apps/demo` hash 路由 `#/chatroom` 独立页，嵌套在 IM Provider 内**验证两包同装**；输入房间 ID 三步接入跑通（历史拉取/消息收发/成员面板/系统通知）
  - `chatroom.*` locale keys（zh-CN/en）经 core `mergeLocaleMessages` 并入；resolver/auto-imports（`EasemobUIKitChatroomResolver` / `EasemobUIKitChatroomImports`）经共享 `gen-aux-entries.mjs` 参数化生成
- **两包同装硬性验收项落地（TECH-DEBT D97）**：
  - core `sdk/client.ts` 新增 **SDK 单例配置对齐**：首次 init 的规范化配置为基准，后续 init（另一场景包）自动对齐（appKey 冲突抛错、其余字段以首次为准 + 告警、managers 追加注册不受影响）——IM + chatroom 同装不再触发 `ChatClient already initialized with different config`；
  - uikit-im `chat-events.ts` `onMessage` / `onMessageRecalled` 忽略 `conversationType === 'chatRoom'` 消息（聊天室广播不流入 IM 会话/消息 store）。
- **版本同步工具升级**：`changelog:check` 扩展为多包版本段校验——裸格式段归入 uikit-im 历史段，新段统一 `@easemob/<pkg>` 前缀；逐包校验最新段一致、段内无重复且 semver 降序。
