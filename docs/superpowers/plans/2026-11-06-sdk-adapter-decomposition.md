# 双 SDK Adapter 拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 websdk5 / webim4 的约 1600 行组合根按内部 store、repository、配置与事件依赖拆分，在不改变公开 API 和运行时行为的前提下，将 `adapter.ts` 降至 500 行以下并增加防回归门禁。

**Architecture:** 两个 adapter 包使用同构的 `adapter/internal-stores/`、`adapter/repositories/` 与 `adapter/config.ts`。组合根继续拥有 client、Domain、store 覆盖和连接生命周期；各工厂只依赖当前包 Domain、contract 类型和窄 host 接口，不反向依赖具体 adapter 类。

**Tech Stack:** TypeScript、ESLint flat config、Vitest、pnpm workspace、Vue 3 类型检查与 Vite 构建。

**Spec:** `docs/superpowers/specs/2026-11-06-sdk-adapter-decomposition-design.md`

## Global Constraints

- 纯结构重构：公开导出、方法签名、默认值、日志语义、事件顺序、登录/登出时序和 SDK 差异均不变。
- 不抽象跨 4.x / 5.x 共用 store，不拆分其他长文件，不顺手修复无关 lint。
- 内部 store 的 `providedStores` 覆盖顺序不变；repository 的既有兼容转换原样保留。
- 新模块禁止 import 具体 adapter 类，禁止值级依赖 `uikit-im` / `uikit-core`。
- 行数硬上限为 500，空行和注释同样计数；只覆盖组合根与本次新增模块。
- 以当前工作区最新内容为基线，不回退或覆盖其他未提交改动；不主动提交或推送 Git。

## Review Focus

- 部分 store 注入：未注入域仍回落内置 store，已注入域不被内置实例覆盖；由 Task 1/3 的既有 adapter 注入测试和包级测试固定。
- 登录/登出与重登：事件注册、提前记账、4.x 预取和 dispose 顺序不得变化；由 Task 1–4 的 adapter 测试与构建固定。
- repository SDK 差异：4.x 会话游标、群已读和用户资料订阅不得被 5.x 语义覆盖；由 Task 2/4 的 repository 测试和逐行差异审查固定。
- 循环依赖与摇树：新模块不得 import 组合根或 UI 包；由各包构建和 `adapter:isolation` 固定。
- 行数门禁必须既能通过当前拆后文件，也能拒绝 501 行目标文件；由 Task 5 的正反两组 ESLint 命令固定。

---

### Task 1: 拆分 websdk5 内部 store

**Files:**
- Create: `packages/uikit-sdk-websdk5/src/adapter/internal-stores/{index,types,client,message,conversation,contact,group,presence,user-info}.ts`
- Modify: `packages/uikit-sdk-websdk5/src/adapter.ts`
- Test: `packages/uikit-sdk-websdk5/src/__tests__/adapter-injected-client.test.ts`（复用，不改行为）

**Interfaces:**
- Produces: `HandlersRef = () => SdkEventHandlers | undefined`；`createInternalStores(host: InternalStoreHost, handlersRef: HandlersRef): EventStores`。
- Produces: `createClientStore(host, handlersRef)`；其余领域导出 `createMessageStore(handlersRef)`、`createConversationStore(handlersRef)`、`createContactStore(handlersRef)`、`createGroupStore(handlersRef)`、`createPresenceStore(handlersRef)`、`createUserInfoStore(handlersRef)`。
- `InternalStoreHost` 仅暴露 `currentUserId: string` 与带可选 `deleteConversationOnGroupDestroyed` 的 client 快照；不得引用 `Websdk5Adapter`。

- [ ] **Step 1: 运行拆分前基线**
  Run: `pnpm exec vitest run packages/uikit-sdk-websdk5/src && pnpm -F @easemob-community/uikit-sdk-websdk5 build`
  Expected: 既有测试与构建结果被记录；若存在失败，先区分既有问题再继续。

- [ ] **Step 2: 原样迁移七个 store 工厂**
  将函数、闭包状态、字段映射和注释移到对应文件；`SdkUiMessage` 与 `HandlersRef` 移入 `types.ts`。client store 只依赖窄 host，其余 store 只依赖 handlersRef、contract 与当前包事件类型。

- [ ] **Step 3: 接入聚合入口并删除组合根旧实现**
  `adapter.ts` 用 `createInternalStores(this, handlersRef)` 替换七段函数调用，保持之后的 `{ ...internalStores, ...providedStores }` 合并顺序不变，删除已迁移函数和仅为它们服务的 import。

- [ ] **Step 4: 验证 websdk5 store 拆分**
  Run: `pnpm exec vitest run packages/uikit-sdk-websdk5/src && pnpm -F @easemob-community/uikit-sdk-websdk5 build`
  Expected: 与基线一致；构建 0 错误。

### Task 2: 拆分 websdk5 repository 与配置辅助逻辑

**Files:**
- Create: `packages/uikit-sdk-websdk5/src/adapter/repositories/{message,conversation,contact,group,presence,user-info}.ts`
- Create: `packages/uikit-sdk-websdk5/src/adapter/config.ts`
- Modify: `packages/uikit-sdk-websdk5/src/adapter.ts`
- Modify: `packages/uikit-sdk-websdk5/src/event/deps.ts`

**Interfaces:**
- Produces: `createMessageRepository(domains: { message: MessageDomain, conversation: ConversationDomain }): MessageRepository`。
- Produces: `createConversationRepository(domain: ConversationDomain)`、`createContactRepository(domain: ContactDomain)`、`createGroupRepository(domain: GroupDomain)`、`createPresenceRepository(domain: PresenceDomain)`、`createUserInfoRepository(domain: UserInfoDomain)`，返回各自契约 repository 类型。
- Produces: `getDefaultFeatures()`、`legacyDataSourceToUserInfoRepository()`；`event/deps.ts` 新增 `ensureEventHandlerDeps()`。

- [ ] **Step 1: 迁移 repository 工厂**
  将六个 getter 的返回对象原样迁入对应工厂；保留 `sendCustom` 值转换、合并消息占位参数、分页结果映射和注释。工厂不得读取 adapter 私有状态。

- [ ] **Step 2: 保留组合根初始化守卫并接入工厂**
  每个 getter 先执行原有 `_domains` / `_userInfoDomain` 守卫和错误文案，再调用对应工厂；不得把守卫延迟到方法调用之后。

- [ ] **Step 3: 迁移配置与事件依赖兜底**
  默认 features、旧 dataSource 转换和最小事件依赖实现保持原值；`ensureEventHandlerDeps()` 与既有 get/set 同处，日志 namespace 保持 `UIKit:Websdk5Adapter`。

- [ ] **Step 4: 验证 websdk5 完整拆分**
  Run: `pnpm exec vitest run packages/uikit-sdk-websdk5/src && pnpm -F @easemob-community/uikit-sdk-websdk5 build && pnpm adapter:isolation`
  Expected: 测试、构建和隔离门禁通过；`adapter.ts` 少于 500 行。

### Task 3: 拆分 webim4 内部 store

**Files:**
- Create: `packages/uikit-sdk-webim4/src/adapter/internal-stores/{index,types,client,message,conversation,contact,group,presence,user-info}.ts`
- Modify: `packages/uikit-sdk-webim4/src/adapter.ts`
- Test: `packages/uikit-sdk-webim4/src/__tests__/adapter-injected-client.test.ts`（复用，不改行为）

**Interfaces:**
- Produces: 与 Task 1 同名的 `HandlersRef`、`InternalStoreHost`、`createInternalStores()` 和七个领域工厂，类型使用 webim4 当前包 `EventStores`。
- Consumes: Task 1 的目录模式，但不 import websdk5 文件。

- [ ] **Step 1: 运行 webim4 拆分前基线**
  Run: `pnpm exec vitest run packages/uikit-sdk-webim4/src && pnpm -F @easemob-community/uikit-sdk-webim4 build`
  Expected: 记录既有测试与构建结果。

- [ ] **Step 2: 原样迁移 webim4 七个 store 工厂**
  保留 4.x 当前所有字段和事件行为；client store 的 client 快照仍固定返回 `null`，不得复用 5.x 的 client 快照逻辑。

- [ ] **Step 3: 接入聚合入口并保持 store 覆盖语义**
  `adapter.ts` 调 `createInternalStores(this, handlersRef)`，现有 providedStores 合并与领域回落不变。

- [ ] **Step 4: 验证 webim4 store 拆分**
  Run: `pnpm exec vitest run packages/uikit-sdk-webim4/src && pnpm -F @easemob-community/uikit-sdk-webim4 build`
  Expected: 与基线一致；构建 0 错误。

### Task 4: 拆分 webim4 repository 与配置辅助逻辑

**Files:**
- Create: `packages/uikit-sdk-webim4/src/adapter/repositories/{message,conversation,contact,group,presence,user-info}.ts`
- Create: `packages/uikit-sdk-webim4/src/adapter/config.ts`
- Modify: `packages/uikit-sdk-webim4/src/adapter.ts`
- Modify: `packages/uikit-sdk-webim4/src/event/deps.ts`

**Interfaces:**
- Produces: 与 Task 2 同名的六个 repository 工厂、`getDefaultFeatures()`、`legacyDataSourceToUserInfoRepository()` 和 `ensureEventHandlerDeps()`，全部使用 webim4 当前包 Domain 类型。
- Consumes: Task 3 完成后的 webim4 组合根，不共享 websdk5 实现。

- [ ] **Step 1: 迁移 webim4 repository 工厂**
  保留 4.x 会话 refresh/loadMore、游标快照、群已读不分页、`getSubscribedUsers()` 空数组等差异，不用 5.x 实现覆盖。

- [ ] **Step 2: 接入工厂并保留初始化守卫**
  各 getter 的未初始化错误仍使用 `[Webim4Adapter]`，守卫时机不变。

- [ ] **Step 3: 迁移 webim4 配置与事件依赖兜底**
  默认 features、旧 dataSource 转换、prefetch 配置读取和最小事件依赖保持原行为；日志 namespace 保持 `UIKit:Webim4Adapter`。

- [ ] **Step 4: 验证 webim4 完整拆分**
  Run: `pnpm exec vitest run packages/uikit-sdk-webim4/src && pnpm -F @easemob-community/uikit-sdk-webim4 build && pnpm adapter:isolation`
  Expected: 测试、构建和隔离门禁通过；`adapter.ts` 少于 500 行。

### Task 5: 增加文件行数门禁与架构约定

**Files:**
- Modify: `eslint.config.js`
- Modify: `.agent/skills/uikit-sdk-adapter-architecture/SKILL.md`
- Modify: `TECH-DEBT.md`

**Interfaces:**
- Produces: 对两个 `src/adapter.ts`、`src/adapter/config.ts`、`src/adapter/internal-stores/**/*.ts`、`src/adapter/repositories/**/*.ts` 生效的 `max-lines` error 规则。
- Produces: 架构 skill 中的目录职责、500 行软硬约束和禁止为通过门禁压缩代码的说明。

- [ ] **Step 1: 增加 ESLint flat config 块**
  使用精确文件范围，规则为 `'max-lines': ['error', { max: 500 }]`，不设置 skipBlankLines / skipComments。

- [ ] **Step 2: 验证门禁能拒绝超长目标文件**
  Run: `node -e "process.stdout.write('// x\\n'.repeat(501))" | pnpm exec eslint --stdin --stdin-filename packages/uikit-sdk-websdk5/src/adapter.ts`
  Expected: 退出码非 0，且报告 `max-lines`，不创建临时源码文件。

- [ ] **Step 3: 验证实际目标范围通过**
  Run: `pnpm exec eslint packages/uikit-sdk-websdk5/src/adapter.ts packages/uikit-sdk-websdk5/src/adapter/config.ts packages/uikit-sdk-websdk5/src/adapter/internal-stores packages/uikit-sdk-websdk5/src/adapter/repositories packages/uikit-sdk-webim4/src/adapter.ts packages/uikit-sdk-webim4/src/adapter/config.ts packages/uikit-sdk-webim4/src/adapter/internal-stores packages/uikit-sdk-webim4/src/adapter/repositories`
  Expected: 无 `max-lines` 错误；若出现其他规则错误，只处理本次迁移引入项，不格式化既有代码。

- [ ] **Step 4: 更新 skill 与技术债**
  在架构 skill 硬规则中记录目录边界和 500 行门禁；在 `TECH-DEBT.md` 用执行时下一个未使用编号登记并核销本次组合根拆分，写清测试与构建证据。不得复用已有 D 编号。

### Task 6: 完整验证与差异复核

**Files:**
- 不新增产品文件；只审查本计划涉及路径。

**Interfaces:**
- Consumes: Task 1–5 的全部产物。

- [ ] **Step 1: 运行三包测试与构建**
  Run: `pnpm exec vitest run packages/uikit-sdk-contract/src packages/uikit-sdk-websdk5/src packages/uikit-sdk-webim4/src && pnpm -F @easemob-community/uikit-sdk-contract build && pnpm -F @easemob-community/uikit-sdk-websdk5 build && pnpm -F @easemob-community/uikit-sdk-webim4 build && pnpm adapter:isolation`
  Expected: 三包测试、构建和隔离门禁通过。

- [ ] **Step 2: 运行 uikit-im 标准门禁**
  Run: `pnpm -F @easemob-community/uikit-im exec vue-tsc --noEmit && pnpm -F @easemob-community/uikit-im build`
  Expected: 类型检查 0 错误，构建成功。

- [ ] **Step 3: 检查结构、行为差异与工作区**
  运行 `wc -l` 确认两个组合根均低于 500；用 `git diff --check`、`git status --short` 和按文件 diff 检查只有预期拆分、门禁与文档改动，既有登录小写化及当前工作区其他逻辑未被覆盖。不得删除用户已有文件。

- [ ] **Step 4: 独立复核**
  由 fresh reviewer 只读审查本计划相关文件，重点核对 Review Focus；Critical / Important 必须先补回归证据再修复，Minor 单独记录，不扩大重构范围。

## Assumptions

- 用户已批准设计 B，并要求开始执行；采用当前会话内联实施，不再询问执行方式。
- 当前工作区未提交改动属于拆分基线，不能用 HEAD 覆盖。
- 500 行阈值只治理组合根和本次新增模块，不代表全仓文件行数已收敛。
- 既有全仓测试可能收集 `tmp/sdk-ref` 或缺少 Vue 插件；本计划以三包完整测试和项目规定构建门禁为准，已知无关失败单独报告。
