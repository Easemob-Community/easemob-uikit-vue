# 微前端 OA 基座宿主兼容性预研

> 状态：**预研结论**（Phase 1 收口后、私有化 OA 基座集成前，按本文第四节做专项评估落地）
> 对应 TECH-DEBT D125，联动 D122（SDK adapter 抽象）/ D85（Electron 持久化）。
> 背景：私有化 OA 项目提出「OA 基座 + 微前端」，IM 是核心协同能力，UIKIT 定位为「未来包提供者 + IM 能力基座」。本文记录 UIKIT 作为微前端子应用 / 共享依赖包被宿主加载时，需要显式处理的宿主兼容性问题——这是一个**与 SDK 版本无关的独立维度**。

---

## 一、结论

1. **微前端与 SDK 适配是两个正交维度**：SDK 适配（D122）解决"切 4.x / 5.x"，微前端解决"UIKIT 被宿主加载时的隔离 / 单例 / 生命周期"。二者不冲突，可并行。
2. **UIKIT 保持"通用包"定位不变**：微前端不要求重写 UI，只要求把几处"全局假设"变成"可作用域化 / 可清理"的边界。
3. **推荐集成形态：共享依赖包**（宿主与 IM 子应用共享同一份 Vue + UIKIT），而非"子应用内独立打包一份 UIKIT"。

---

## 二、集成形态选择（先决策，不写代码）

| 形态 | 说明 | 结论 |
| --- | --- | --- |
| A. 共享依赖包 | 宿主与子应用共享同一份 Vue + UIKIT（Module Federation `shared` / externals / alias） | **推荐**：单例 / 主题 / SDK 只有一份，问题最少，符合"包提供者"定位 |
| B. 子应用内独立打包 | 每个子应用 bundle 里内联一份 UIKIT | 不推荐：体积大 + 单例 / 样式隔离问题最多；除非宿主完全沙箱（Shadow DOM / strict-style） |

---

## 三、宿主兼容性风险清单（代码级证据）

### 1. 模块级单例串扰

- **现象**：`use-toast` / `use-notification`（顶层 `state = ref(...)`）、`use-quote`（顶层 `quotedMessage`）、`useMessageActions` 多选态、`useLocale` 的 `currentLocale`、`useTheme` 都是模块顶层单例。多子应用 / 多实例并存时状态互串。
- **证据**：`packages/uikit-core/src/composables/use-notification.ts:63`（`const state = ref(...)`）、`packages/uikit-im/src/composables/use-quote.ts:21`（顶层 `quotedMessage`）；多个 skill 明确"禁止组件内另建第二份状态，必须走单例"。
- **建议**：先确认 OA 基座中 IM 是否**单实例**；若可能多实例并存，需评估单例容器化（`provide/inject` 化）的改造范围，属于较大改动，需单独立项。

### 2. 主题变量作用域是全局的

- **现象**：主题变量挂在 `:root`，暗色用 `[data-uikit-theme="dark"]` 属性选择器（非容器 class）。共享 document 时，兄弟子应用改 `--uikit-*` 或挂同名 `data-uikit-theme` 会污染 UIKIT，反之亦然。
- **证据**：`packages/uikit-core/src/theme/index.css:1`（`:root`）、`:412`（`[data-uikit-theme="dark"]`）。
- **建议**：评估"变量作用域可选开关"（`:root` → 容器 class，如 `.uikit-scope`），默认保持现状、微前端宿主下开启作用域。

### 3. 全局 window 副作用

- **现象**：通知点击 `window.focus()`、键盘监听 `window` 事件、`download` 走 `window.open`。
- **证据**：`use-notification` 的 `window.focus()`；`use-keyboard` 的 `window` listener；`utils/download.ts` 的 `window.open`。
- **建议**：这些调用点已是平台适配点（D85 已列外链 / 下载注入）。微前端下需确认子应用 unmount 时监听被清理——复用 D123 已确立的"生命周期对称"原则（登出 / 卸载时清理，重建时恢复）。

### 4. SDK 单例与反复挂载

- **现象**：`ChatClient` 是全局单例；子应用反复挂载 / 卸载 + 宿主也可能集成时，存在"已初始化 / 配置冲突"。
- **证据**：仓库已有 IM + chatroom 同装时的"SDK 单例配置对齐"案例（core `sdk/client.ts`，首次 init 配置为基准、appKey 冲突抛错）。
- **建议**：与 D122 决策 18（单一生命周期所有者）对齐——明确谁 init / dispose，子应用 unmount 时按模式清理。

---

## 四、与 D122 的衔接

- D122 决策 17–21 正是微前端 OA 场景催生的补充决策；其中决策 21（UIKit 层门面生命周期：launch/disposer + 单实例）是第 3/4 点卸载清理的**具体机制**——子应用 unmount 时经 disposer 干净回收 store/事件/监听。
- 微前端宿主兼容性的落地时点：**Phase 1（防腐层收口）之后、私有化 OA 基座集成之前**，做一次专项评估，产出上面 4 点的具体改造清单。

---

## 五、待确认问题

1. **微前端技术选型**（qiankun / micro-app / wujie / Module Federation）——决定样式隔离与 JS 沙箱策略，直接决定第 2/3 点改造的必要性与幅度。
2. **IM 是否允许多实例并存**（多个子应用各自一个 IM）——决定第 1 点单例是否需要容器化。
3. **宿主是否允许 UIKIT 直接操作 `document` / `window`**（主题 `:root`、notification `window.focus`）——决定主题作用域改造的必要性。
