# 会话置顶在增量同步后被误删问题报告

> 日期：2026-11-13<br>
> 模块：`easemob-websdk` / session-list 增量同步与本地缓存合并<br>
> 已核对受影响版本：`5.1.2`、`5.1.3`、`5.2.0`<br>
> 实际复现环境之一：SDK `5.2.0` + UIKit-IM `3.13.0` + Adapter `1.6.2`
> 早期复现环境：SDK `5.1.2` + UIKit-IM `3.11.0` + Adapter `1.5.0`

## 1. 问题摘要

本地存在多个置顶会话时，其中一个置顶会话收到新消息，随后刷新页面或再次触发会话同步，会话列表可能先从缓存恢复完整列表，随后在 `onConversationListUpdate` 中减少一条或多条。

已观察到：

- 三条会话经过连续两次同步，出现 `3 → 2 → 1`。
- 三条置顶会话在一次同步中直接变成一条。
- 两个置顶会话加一个新消息普通会话，在一次同步后由三条变成两条，其中一条原有置顶被删除，新消息普通会话保留。

该问题不是 UIKit 的置顶按钮、排序或渲染逻辑导致。UIKit 使用的是 SDK 输出的会话快照及 `patch.removed`。服务端置顶状态未必真的被取消，当前证据指向 **SDK 在客户端本地缓存合并时误删置顶会话，并将误删结果写入 `patch.removed`**。

## 2. 高置信度根因

### 2.1 根因结论

SDK 的增量会话合并逻辑存在以下假设：

> 只要本次增量结果中包含置顶会话，就把本次结果中的置顶会话当作当前完整置顶集合。

但实际日志证明，服务端增量响应可以只返回发生变化的会话：

- 返回的置顶会话只是完整置顶集合的一部分。
- 其他本地置顶会话没有出现在增量结果中，并不是明确返回 `pinned_time: 0`。
- SDK 却将这些缺席的置顶会话从本地快照中删除。

因此，根因不是“置顶操作失败”或“新消息数据异常”，而是：

> **SDK 将“增量结果中的部分置顶会话”错误解释为“完整置顶集合”，导致未返回的置顶会话被误删。**

### 2.2 为什么置顶与问题直接相关

置顶既是特殊分支的触发条件，也是被错误删除的对象范围：

- 增量结果中没有置顶会话时，不进入该特殊分支。
- 增量结果中至少有一个置顶会话时，特殊分支生效。
- 普通会话即使没有出现在增量结果中，也不会被该分支按同样方式清理；缺席的置顶会话却会被删除。
- 只有一个本地置顶时，没有其他置顶可删，通常看不到“置顶数量减少”。

新消息只是常见触发器：它使某个置顶会话进入下一次增量结果。未读数、标记、免打扰等变化只要使部分置顶会话进入增量结果，也可能触发同类问题。页面刷新不是必要条件，任何一次 `refreshSessionList()` 都可能触发。

## 3. 触发条件

问题需要同时满足：

1. 本地至少有两个置顶会话。
2. 本地已有会话同步 checkpoint，即 `sessionsLastSyncTs > 0`，本轮走增量同步。
3. 本次增量结果至少包含一个 `pinned_time > 0` 的会话。
4. 本次增量结果没有包含全部本地置顶会话。

可简化为：

```text
本地多个置顶
+ 已有同步 checkpoint
+ 增量返回部分置顶
= 未返回的其他置顶被 SDK 删除
```

全量同步与增量同步的“缺席”语义不能混用：

- 全量快照中的缺席可以表示会话已不存在或状态应以服务端全量结果为准。
- 增量结果中的缺席只表示该会话本轮没有返回，不能据此推断它已取消置顶。

## 4. 源码定位

以下路径均相对于 `websdk2` 仓库根目录。

### 4.1 已有 checkpoint 后走增量同步

`src/core/session-list-sync/session-list-sync-controller.ts:155-156`

```ts
const previousCheckpoint = cacheManager.loadSessionListCheckpoint();
const syncMode = previousCheckpoint.sessionsLastSyncTs > 0 ? 'incremental' : 'full';
```

`src/core/session-list-sync/session-list-sync-controller.ts:194-199` 将同步结果及 `mode` 交给缓存提交。

`src/core/session-list-sync/session-list-sync-controller.ts:220` 在全量模式时发出 `reset=true`，增量模式则为 `reset=false`。这与日志中的事件字段一致。

### 4.2 问题核心：置顶特殊合并规则

`src/core/session-list-sync/session-list-sync-merge.ts:138-158`

关键逻辑：

```ts
const incomingPinned = options.incoming.filter(item => getPinnedTime(item) > 0);

const nextBase =
  incomingPinned.length > 0
    ? options.existing.filter(item => {
        if (incomingMap.has(buildSessionKey(item))) {
          return false;
        }
        return getPinnedTime(item) === 0;
      })
    : options.existing.filter(item => !incomingMap.has(buildSessionKey(item)));
```

当 `incomingPinned.length > 0` 时：

- 已包含在本次 `incoming` 中的旧会话先被移除，随后由新数据替换，这是正常的逐条更新。
- 未包含在本次 `incoming` 中的普通会话被保留。
- **未包含在本次 `incoming` 中的置顶会话也被移除，这就是误删来源。**

`src/cache/cache-manager.ts` 的 `buildIncrementalSessionListRecords()` 调用上述 `mergeSessionListIncrementalWithPinnedOverride()`，因此该规则进入正式增量同步路径。

### 4.3 SDK 自己生成 `removed`，UIKit 只是消费

`src/chat-client.ts:2633-2655` 从合并后的缓存快照派发会话列表事件。

`src/chat-client.ts:2681-2688` 将“旧快照有、新快照没有”的会话放入 `removed`：

```ts
for (const item of previousItems) {
  const key = this.buildConversationListKey(item);
  if (!nextMap.has(key)) {
    removed.push({
      conversationId: item.conversationId,
      conversationType: item.conversationType,
    });
  }
}
```

所以 UIKit 收到的 `patch.removed` 是 SDK 合并结果经新旧快照 diff 后产生的，不是 UIKit 自行决定删除。

### 4.4 当前测试固化了错误预期

`tests/unit/session-list-sync/session-list-sync-controller.test.ts:720-774`

当前用例名为：

```text
incremental refresh should replace local pinned set with pinned sessions returned by server
```

该测试明确期望：增量只返回一个新置顶时，删除本地旧置顶。它与本次实际线上行为一致，但把错误的合并假设固化成了正确预期，修复时需要同步调整。

## 5. 稳定复现步骤

### 5.1 环境准备

- 使用受影响 SDK 版本，保持 IndexedDB / localStorage 等本地缓存能力可用。
- 使用普通浏览器窗口，先清除站点 Site Data，避免旧 checkpoint 或已损坏缓存干扰。
- 准备 A、B、C 三个已有历史消息的会话；最小复现也可以只使用 A、B 两个。
- 测试期间不要操作同账号其他设备，并尽量避免其他会话同时产生变化。

### 5.2 建立完整置顶基线

1. 登录测试账号。
2. 依次置顶 A、B、C，等待三次置顶请求全部成功。
3. 刷新一次页面。由于之前清除了站点数据，这次应走全量同步。
4. 确认 A、B、C 均显示为置顶，并等待会话同步完成，使 checkpoint 成功落盘。

如果这次已经复现，可直接记录；否则继续后续步骤。

### 5.3 避开增量重叠窗口

等待 **30 秒以上**，期间不要发消息、取消置顶、修改免打扰或会话标记。

`src/config/timeouts.ts:28` 中：

```ts
export const SESSION_LIST_SYNC_OVERLAP_MS = 1000 * 20;
```

增量请求会使用 checkpoint 前推 20 秒。等待超过 20 秒可以避免此前的置顶操作也落入下一次增量结果，从而提高“只返回一个置顶会话”的稳定性。

### 5.4 只改变一个置顶会话

1. 用另一个账号只向 A 发送一条新消息。
2. 等 A 的最后消息或未读数已经更新。
3. B、C 不发生任何变化。
4. 再等 2～3 秒。

### 5.5 再次触发会话同步

刷新页面，或离开聊天页后返回以再次触发 `refreshSessionList()`。

当前版本的预期现象：

1. 先从本地缓存恢复 A、B、C。
2. 增量响应只返回部分置顶会话。
3. `onConversationListUpdate` 以 `reset=false` 发出更新。
4. 列表减少一条或两条；连续同步时可能继续减少。

修复后的正确结果应为：A 的消息摘要和未读数更新，B、C 的置顶状态与本地会话保留，列表不因“增量缺席”而减少。

### 5.6 控制台确认标准

缓存恢复阶段：

```text
onConversationListUpdate { count: 3, reset: true, removed: 0 }
```

增量响应应看到：

```text
Decoded session-list sync raw response
sessions: [仅包含部分本地会话]
isLastBatch: true
```

当前问题版本的后续事件类似：

```text
onConversationListUpdate { count: 2, reset: false, removed: 1 }
```

或一次删除两条：

```text
onConversationListUpdate { count: 1, reset: false, removed: 2 }
```

稳定复现的关键不是刷新速度，而是控制增量响应内容：**已有完整置顶基线，下一次增量只返回其中一部分置顶会话。**

## 6. 日志证据

### 6.1 证据一：SDK 5.2.0 上完整出现 `3 → 2 → 1`

材料：浏览器控制台导出 `download`。

版本行明确显示：

```text
SDK version: 5.2.0, UIKit-IM version: 3.13.0, Adapter version: 1.6.2
```

关键事件：

| 时间 | 事件 | 结果 |
|---|---|---|
| `13:45:06.112` 附近 | `count: 3, reset: true, removed: 0` | 缓存恢复三条 |
| `13:45:06.310` | 收到 session-list 增量响应 | 即将发生合并 |
| 紧接其后 | `count: 2, reset: false, removed: 1` | 三条变两条 |
| `13:46:17.419` | 再次收到 session-list 增量响应 | 再次合并 |
| 紧接其后 | `count: 1, reset: false, removed: 1` | 两条变一条 |

第二次减少前没有重新登录，只是再次触发会话同步，说明页面刷新不是必要条件。

### 6.2 证据二：单次 `3 → 1`，增量完整结果只有一个置顶

材料：`easemob-uikit-logs-2026-11-13T05-49-43.log`，时间 `13:49:28.395`。

该条响应没有截断，完整内容显示：

```text
sessions: [
  {
    session_id: "hfp",
    pinned_time: 1794548465000,
    updated_at: 1794548648000
  }
],
isLastBatch: true
```

这证明：

- 本轮同步已经是最后一包，不存在后续包补齐其他置顶。
- 完整增量结果只有 `hfp` 一条，且它为置顶。
- 其他本地置顶没有返回 `pinned_time: 0`，而是完全缺席。

结合上述合并代码，本地另外两个置顶会在同一次合并中被移除，因此视觉上直接从三条变成一条。

### 6.3 证据三：新消息普通会话触发 `3 → 2`，原有置顶被删除

材料：`easemob-uikit-logs-2026-11-13T06-07-09.log`。

#### 基线：两个会话明确处于置顶状态

- `14:05:35`：`pfh2` 置顶请求成功。
- `14:05:40`：`hfp` 置顶请求成功。
- `14:06:05.268` 的完整响应中：

```text
pfh2  pinned_time = 1794549936000
hfp   pinned_time = 1794549940000
```

#### 新消息带来第三个普通会话

`14:06:51–14:06:55` 连续收到三条来自 `hfp2` 的新消息。

此时本地可形成：

```text
pfh2（置顶）+ hfp（置顶）+ hfp2（普通新消息会话）
```

#### 增量响应只返回部分置顶

`14:06:59.066` 的完整响应为：

```text
pfh2  pinned_time = 1794549936000
hfp2  pinned_time = 0
isLastBatch: true
```

关键事实：

- `hfp` 没有返回。
- `hfp` 没有收到取消置顶请求。
- `hfp` 也不是以 `pinned_time: 0` 返回。
- 新消息普通会话 `hfp2` 正常保留。

响应后紧接着出现：

```text
Call getConversationSilentModes [{"count":2}]
```

与 SDK 合并后只剩 `pfh2 + hfp2` 相吻合。该案例清晰展示了：新消息会话本身可以正常保留，但原有置顶 `hfp` 因未进入增量结果而被误删。

## 7. 修复建议

### 7.1 推荐：增量按会话 key 逐条更新，缺席不代表取消置顶

去掉 `incomingPinned.length > 0` 时清理其他置顶的特殊分支，增量统一按会话标识合并：

```ts
const nextBase = options.existing.filter(
  item => !incomingMap.has(buildSessionKey(item))
);

return sortSessionListRecords([
  ...nextBase,
  ...options.incoming,
]);
```

修复后的语义：

- 增量只返回 A：只更新 A，B、C 保留。
- 返回 B 且 `pinned_time: 0`：明确取消 B 的置顶。
- 返回新置顶 D：正常新增或更新 D。
- 全量同步：继续使用完整快照收敛，不扩大本次修改范围。
- 真正的会话删除：继续通过既有删除通道处理。

### 7.2 多设备取消置顶契约需要一并确认

SDK 已将多设备 `top/not_top` 归一化为 `CONVERSATION_PINNED/UNPINNED`，但 `ChatClient` 当前的多设备会话处理只实际消费了删除事件。

建议确认：

- 如果其他设备取消置顶后，增量响应一定包含该会话且 `pinned_time: 0`，上述最小修复即可覆盖。
- 如果取消置顶也可能只表现为增量缺席，则还需将 `CONVERSATION_PINNED/UNPINNED` 写回本地缓存，避免从“误取消”变成“真实取消不生效”。

这部分属于需要 SDK 团队确认的协议边界，不影响当前误删根因的判断。

### 7.3 必须补充或调整的回归用例

1. A、B、C 三个置顶，增量只返回 A → 三个全部保留。
2. 连续多次增量只返回部分置顶 → 列表不逐次缩水。
3. 增量返回 B 且 `pinned_time: 0` → 只取消 B。
4. 全量快照缺少 B → 允许按全量语义移除 B。
5. 正常删除会话 → 仍进入 `patch.removed`。
6. 其他设备执行 `top/not_top` → 本地状态正确。
7. 新消息普通会话与部分置顶同时出现在增量中 → 普通会话正常更新，其他置顶不丢失。

同时应调整 `session-list-sync-controller.test.ts:720-774` 当前“缺席旧置顶应被删除”的错误预期。

## 8. 不建议的规避方式

- **不建议 UIKit 忽略 `patch.removed`**：会把真实删除也屏蔽，且无法修复 SDK 已损坏的缓存快照。
- **不建议每次刷新强制全量同步**：只是绕开问题，增加同步成本。
- **不建议清除 checkpoint**：同样只是规避，未修复增量合并语义。
- **不建议仅通过升级现有版本处理**：已核对 `5.1.3` 和 `5.2.0` 的相关代码，问题逻辑仍存在。

## 9. 结论

本问题具有高置信度的客户端源码根因和完整日志佐证：

> 新消息或其他会话变化使部分置顶会话进入增量结果；SDK 的置顶特殊合并规则将本次结果误认为完整置顶集合，从而删除其他未返回的本地置顶，并通过 `patch.removed` 通知 UIKit。

建议由 SDK 侧修正增量合并语义，并以“部分置顶缺席保留、显式 `pinned_time: 0` 取消、全量快照正常收敛、多设备取消置顶不回归”为验收标准。

## 10. 附件材料

- `download`：SDK 5.2.0 浏览器控制台日志，包含 `3 → 2 → 1` 事件序列。
- `easemob-uikit-logs-2026-11-13T05-49-43.log`：包含单次只返回 `hfp` 且 `isLastBatch=true` 的完整增量响应。
- `easemob-uikit-logs-2026-11-13T06-07-09.log`：包含 `pfh2`、`hfp` 置顶基线，`hfp2` 新消息，以及后续 `hfp` 缺席的完整响应。
