# 流式消息（Stream Message）接入 UIKIT 设计执行计划

> 状态：**M1（内核数据链路）+ M2（内核纯文本流式渲染）+ M3（demo markdown 插件验证）已落地**（2026-08-14）；
> M4（AI 集成）demo mock 会话已完成，真实模型对接（DeepSeek 直连 / 业务代理）待执行；M5（抽包 + 文档）待执行。
> 对应 TECH-DEBT [D95](#d95)。
> 背景参考：环信 Web SDK「接收流式消息」https://doc.easemob.com/document/web/message_stream_receive.html

---

## 一、背景与结论

环信 IM 支持**流式消息**（边生成、边发送、边接收，典型场景 AI 对话 / 实时协作 / 分段生成）。

**SDK 语义（已核实）**：
- 仅支持**文本消息**流式（`text` 类型，非 custom 新类型）；
- **客户端只接收、不发送**（由业务服务端 RESTful 下发）；
- SDK 通过 `chatManager.addEventHandler` 触发 `onStreamMessage`，按 `msgServerId` 排序合并分片；
- 消息体 `stream` 字段：`deltaText`（分片增量）/ `fullText`（累计合并，同 `body.content`）/ `status`（开始/传输中/完成/异常）/ `customType`（业务自定义流类型，如 `'text'` / `'markdown'`）/ `errorType` / `finishReason`。

**核心结论**：流式不是一种新消息类型，而是 **TEXT 消息的一种「接收状态」+ 一个 `customType` 标注**。因此 UIKIT 的接入应遵循「**内核薄、插件厚**」：内核只内置「数据链路 + 默认纯文本流式状态」，markdown 渲染与 AI 集成等重依赖/可选能力全部走插件。

---

## 二、三层架构设计

### 第 1 层：内核内置（所有人都需要，很轻）

**目标**：让流式消息「正确接收、合并、同一条气泡内更新」。

```
SDK onStreamMessage 事件
  → 按 msgServerId 合并分片
  → 更新 messageMap 中同一条 TEXT 消息（body.content = fullText，不新增消息）
  → 挂 stream 状态（status / customType / deltaText / fullText / errorType / finishReason）
```

任务清单：
1. **类型层**：`sdk/types` 的 `UiMessage` 增加可选 `stream?` 扩展字段（`StreamMessageState`：`status` / `customType` / `deltaText` / `fullText` / `errorType` / `finishReason`），枚举 `StreamMessageStatus` 入 `src/constants`。
2. **事件层**：`sdk/event/chat-events.ts` 增加 `onStreamMessage` 事件处理 —— 按 `msgServerId` 去重合并，`deltaText` 追加、`fullText` 覆盖写入 `body.content`，`status` 终态（完成/异常）标记消息就绪；复用 `messageStore.updateMessageById`（流式分片**覆盖更新同一条消息**，不产生新气泡）。
3. **渲染层**：`message-item/text-message.vue`（或 bubble wrapper）内置**纯文本流式状态** —— `customType='text'` 时：传输中显示光标闪烁 / 打字机尾部指示、完成态收敛、异常态提示。**不引入 markdown 依赖**。

### 第 2 层：markdown / 丰富气泡 → 插件（按需，重依赖不进内核）

**目标**：`customType='markdown'` 等富格式流式内容由插件接管渲染。

- 内核不内置 markdown 渲染器（markdown-it + 代码高亮 + LaTeX 是重依赖，多数用户不需要）。
- 插件通过 UIKIT 已有的消息类型插槽（`#message-txt` / `#message-custom`）**替换** markdown 流式气泡，内核无感。
- 插件能力范围：markdown 渲染（代码块 / 表格 / 引用 / 公式）、流式打字机动画、富交互。

### 第 3 层：AI 集成 → 插件（最外层，零侵入）

- `@easemob/uikit-ai`（或先做 `apps/demo` 参考实现）：DeepSeek 对接 + markdown 流式气泡 + 打字机动画 + AI 助手会话 + 工具条 AI 入口。
- 复用扩展点：`useChatPlugin()` 的 `#toolbar-extra` / `#message-custom` / `#message-action-extra`、`beforeSend` 拦截、`dataSource` 接管。
- API key 不前端直调：插件提供「直连 / 业务代理 / mock」三模式（mock 供文档演练场）。

---

## 三、执行顺序与里程碑

| 阶段 | 内容 | 产出 | 预估 |
| --- | --- | --- | --- |
| M1 | 内核数据链路：`stream` 类型 + `onStreamMessage` 合并 + store 覆盖更新 | 流式分片能正确合并到同一条消息 | 1 天 |
| M2 | 内核渲染：TEXT 气泡纯文本流式状态（光标/终态/异常） | `customType='text'` 流式打字机可用 | 0.5 天 |
| M3 | 插件验证：demo 参考实现 markdown 流式气泡 + 打字机 | 富格式流式可渲染 | 1 天 |
| M4 | AI 集成：DeepSeek 对接 + AI 助手会话（demo 参考实现） | 端到端 AI 对话 | 1~2 天 |
| M5 | 抽包 + 文档：独立 `@easemob/uikit-ai` + 文档页 + 在线演练场 | 可发布插件 | 1 周内 |

> ✅ M1 / M2 / M3 已于 2026-08-14 完成（含 `onMessage` 丢片补偿、流式滚动跟随、demo markdown 流式气泡）。
> 🟡 M4：demo 已落地 AI 助手 **mock** 会话（toolbar 入口 + 设置面板 + 分片模拟器）；
> 真实模型对接按三模式（Mock / 直连 / 业务代理）文档指引执行，DeepSeek 直连/代理待接。

---

## 四、关键决策点（执行前逐项确认）

> 执行状态（2026-08-14）：决策点 1/5 已由需求方确认；2/3/4 已按下列结论落地。

1. **内核范围边界**：内核只做 `customType='text'`（含缺省）纯文本流式，markdown 一律走插件。**（已确认：是）**
2. **流式气泡渲染接口**：**不加新插槽契约** —— 流式是 TEXT 消息的接收状态，`stream` 字段随 `UiMessage` 透出；
   插件沿用现有 `#message-txt` / `#message-custom` 插槽（`message-renderer.vue` 插槽优先级最高），
   按 `message.stream?.customType` 判定接管，内核无感。**（已落地）**
3. **`stream` 与会话摘要 / 未读**：未读计数由 SDK 会话同步驱动，内核不做特殊处理；
   当前会话摘要由 `chat.vue` 的 `lastMessageSummary` 响应式 watch 随 `body.content` 更新自动刷新，
   非当前会话摘要由 SDK `onConversationListUpdate` 同步驱动。**（已落地）**
4. **历史消息回流**：`loadHistory` 拉到的流式消息为终态，`prependMessages` 按 `msgServerId` 去重，
   不会重复合并；离线/断连错过分片时，`onMessage` 同步到达的完整消息会覆盖 store 中未完成的
   流式副本（丢片补偿）。**（已落地）**
5. **demo 形态**：AI 层先做 demo 参考实现，M3 再评估是否独立抽包。**（已确认：demo 参考实现）**

---

## 五、风险

| 风险 | 对策 |
| --- | --- |
| 分片乱序 / 丢片 | 依赖 SDK 排序合并；内核按 `msgServerId` 幂等覆盖 `fullText`，不依赖增量顺序 |
| markdown 依赖体积 | 不进内核，插件按需引入 |
| API key 前端直调不安全 | 插件三模式（直连 / 代理 / mock），生产建议代理 |
| 流式高频更新性能 | 分片覆盖更新走 store 响应式，必要时节流重渲染（打字机层） |

---

## 六、验收标准

- [x] `onStreamMessage` 分片能合并为同一条消息，气泡内 `fullText` 持续更新、无重复气泡（M1，2026-08-14）
- [x] `customType='text'` 纯文本流式：传输中光标、完成收敛、异常提示（M2，2026-08-14）
- [x] 插件 markdown 流式气泡（demo）：代码块 / 表格 / 引用正确渲染 + 打字机动画（M3，2026-08-14，`apps/demo/src/components/ai/`）
- [ ] DeepSeek AI 助手会话端到端跑通（demo 或独立包）：demo mock 会话已通，真实模型对接待执行（M4）
- [x] 门禁：`pnpm -F @easemob/uikit exec vue-tsc --noEmit` + build + demo 类型检查通过（M1/M2/M3 已通过）

---

## 七、关联

- TECH-DEBT：**D95**（本计划）
- 文档：环信「接收流式消息」
- 涉及 skill：`uikit-message-rendering`（气泡渲染）、`uikit-chat-plugin-tabs`（插件/插槽）、`websdk2-uikit-migration`（sdk/event 层）、`uikit-component-authoring`（类型/枚举常量）
