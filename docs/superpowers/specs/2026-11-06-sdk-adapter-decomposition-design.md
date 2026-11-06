# 双 SDK Adapter 拆分与文件行数约束设计

## 1. 背景与意图

`packages/uikit-sdk-websdk5/src/adapter.ts` 与 `packages/uikit-sdk-webim4/src/adapter.ts` 当前分别约 1633 / 1669 行。文件同时承载内部 store、repository 转发、SDK client 创建、Domain 装配、连接生命周期和事件订阅，定位具体逻辑需要在大文件中跳转，后续修改也容易产生跨职责回归。

目标是在不改变任何公开 API 和运行时行为的前提下，按既有职责边界拆分两个组合根，并增加可执行的超长文件约束，避免同类问题继续增长。

## 2. 目标

- `adapter.ts` 只承担组合根：client/Domain/store 装配、`init/login/logout`、事件订阅与能力暴露。
- 内部 store 按领域拆成独立文件，保留 4.x / 5.x 各自现有实现与差异。
- repository 按领域拆成独立工厂，保留 SDK 差异和既有字段转换。
- 配置默认值与兼容转换从组合根移出。
- 双 adapter 使用同构目录与命名，降低切换成本。
- 对组合根和本次新增模块设置 ESLint `max-lines=500` 硬约束。
- 在 `uikit-sdk-adapter-architecture` skill 中登记目录职责、禁止反向依赖和 500 行软约定。

## 3. 非目标与反目标

- 不修改 `SdkAdapter`、`SdkConfig`、repository、domain、组件 props/emits 等公开契约。
- 不修改登录小写化、提前记账、失败清理、预取、重连、事件扇出或持久化行为。
- 不抽象 4.x / 5.x 共用 store 基类，不把两套实现合并到 contract/core。
- 不拆分 `message-domain.ts`、`chat-events.ts` 等其他长文件，不顺手清理其 lint。
- 不以减少行数为目标压缩代码、删除注释或改写逻辑。
- 不新增运行时依赖，不调整包入口和产物结构。

## 4. 已考虑方案

### A. 只抽内部 store

风险最小，但组合根仍约 700–800 行，repository 和装配职责继续混杂，不满足可读性目标。

### B. 按职责完整拆分，保留双 SDK 各自实现（已选择）

同时抽内部 store、repository 和配置辅助函数；`adapter.ts` 保留组合根与生命周期。改动范围清晰，可使用现有测试做行为回归，预计组合根降至约 300–400 行。

### C. 拆分时顺便抽象跨 SDK 共用 store

虽然能减少重复，但会把物理重构扩大成双 SDK 行为归一化。4.x / 5.x 在会话、回执、用户资料等方面已有刻意差异，第一轮不做。

## 5. 目标文件结构

两个 adapter 包采用相同结构：

```text
src/
  adapter.ts                         # 组合根 + 生命周期 + 公开 SdkAdapter 实现
  adapter/
    config.ts                        # 默认 features、旧 dataSource 转换
    internal-stores/
      index.ts                       # createInternalStores() 聚合入口
      types.ts                       # HandlersRef、内部消息扩展类型、host 接口
      client.ts
      message.ts
      conversation.ts
      contact.ts
      group.ts
      presence.ts
      user-info.ts
    repositories/
      message.ts
      conversation.ts
      contact.ts
      group.ts
      presence.ts
      user-info.ts
  event/
    deps.ts                          # 既有 get/set + ensureEventHandlerDeps()
```

现有的 `adapter/message-adapter.ts` 等 wire 字段映射文件保持原路径，不与 `repositories/` 混放。

## 6. 依赖与接口边界

### 6.1 内部 store

- 每个 `internal-stores/<domain>.ts` 导出对应的 `create<Domain>Store`，返回既有 `EventStores[<domain>]`。
- `internal-stores/types.ts` 定义 `HandlersRef = () => SdkEventHandlers | undefined` 和内部消息扩展类型；该类型不再留在组合根。
- `createClientStore` 通过一个窄 host 接口读取 `currentUserId` / client 快照，不 import 具体 adapter 类，避免 `adapter.ts ↔ internal-stores` 循环依赖。
- 4.x client store 的 client 快照继续返回 `null`；5.x 继续暴露 `deleteConversationOnGroupDestroyed`，不得借 host 抽象统一二者行为。
- `internal-stores/index.ts` 负责构造七个内置 store；`adapter.ts` 继续执行 `providedStores` 覆盖，覆盖顺序和缺省域回落不变。
- 所有 store 写入仍经既有 `handlersRef` 扇出，不增加新事件通道。

### 6.2 Repository

- 每个 `repositories/<domain>.ts` 导出 `create<Domain>Repository(...)`，参数使用该 domain 的现有具体 Domain 类型，返回契约层对应 repository。
- `adapter.ts` 的 getter 继续负责“未初始化即抛错”的守卫，再调用工厂；错误文案保持现有 adapter 名称。
- 5.x 与 4.x 的会话分页、群已读分页、用户资料订阅等差异留在各自工厂，不增加 capabilities 分支。
- 现有 `sendCustom` 参数 `String()` 收敛、合并消息占位参数等兼容逻辑随代码原样迁移。
- repository 工厂只依赖 contract 与当前包 domain，不依赖 UI 包或具体 adapter 实例。

### 6.3 配置与事件依赖

- `getDefaultFeatures()` 与 `legacyDataSourceToUserInfoRepository()` 移入各自 `adapter/config.ts`，默认值不变。
- `ensureEventHandlerDeps()` 移入各自 `event/deps.ts`，与既有 `getEventHandlerDeps` / `setEventHandlerDeps` 同处；最小兜底实现和日志命名空间保持原行为。
- 事件 fanout、同步状态监听和 `_setupEventHandlers()` 暂留组合根，避免一次扩展到过多边界。

## 7. 文件行数约束

在根 `eslint.config.js` 增加独立 flat config 块：

- 范围仅包括两个 `src/adapter.ts`、各自 `src/adapter/config.ts`、`src/adapter/internal-stores/**/*.ts`、`src/adapter/repositories/**/*.ts`。
- 规则为 `max-lines: ['error', { max: 500 }]`，空行和注释也计数，避免通过格式或注释规避。
- 不覆盖测试目录和其他既有源码，避免一次引入无关 lint 债务。
- 500 行是本次硬上限，不是目标值；组合根设计目标仍为约 300–400 行。
- `uikit-sdk-adapter-architecture` 增加约定：新增/修改模块接近或超过 500 行时先复盘职责；不得为通过门禁压缩代码或删除有效注释。

该约束只治理本次识别的组合根及其新增模块，不宣称全仓库所有文件都已低于 500 行。

## 8. 实施顺序

1. 以当前工作区内容为基线运行双 adapter 现有测试和构建，记录既有失败，不回退其他未提交改动。
2. websdk5：先抽内部 store，再抽 repository/config/event deps；每个步骤运行相关测试与包构建。
3. webim4：按相同顺序镜像拆分，保留 4.x 特有逻辑。
4. 运行双包既有 adapter/domain/event/repository 测试及 `adapter:isolation`。
5. 增加 ESLint 行数门禁，对目标范围执行 lint，证明规则生效且无存量违规。
6. 更新 `uikit-sdk-adapter-architecture` 的目录职责与硬规则。
7. 运行 uikit-im 类型检查和构建，检查最终 diff 与新增文件，确保没有产物或无关格式化改动。

若现有工作区在拆分期间继续变化，以最新文件内容为准做局部迁移，不使用 Git 历史覆盖当前实现。

## 9. 验收标准

- 两个 `adapter.ts` 均低于 500 行，且只保留组合根/生命周期相关职责。
- 所有内部 store 和 repository 新文件均低于 500 行。
- 双 adapter 的公开导出、方法签名、能力矩阵与产物入口不变。
- 现有相关测试在拆分前后结果一致；无新增行为变更。
- 三包构建、adapter 隔离、目标 ESLint 门禁、uikit-im 类型检查与构建通过。
- 技术债中如有本拆分条目，完成后记录实际拆分结果与验证证据。

## 10. 留给实施者的决定

- 各工厂函数内部局部变量命名和类型导入排列按周边代码风格处理。
- 若某个文件因纯搬移后仍略超 500 行，优先按既有领域职责继续拆分，而不是提高阈值。
- 是否新增纯结构说明注释由代码可读性决定；不为解释旧实现增加重复注释。
