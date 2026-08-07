# 图标资产合并策略（icons-next → assets/icons）

> 日期：2026-08-07 · 状态：策略沉淀，待按批次执行
> 对应 TECH-DEBT：D90 · 关联：`ICON-STYLE-SYSTEM-RESEARCH.md`、`DIGITAL-CAPSULE-ICON-RESEARCH.md`

## 1. 现状定义：避免“两个图标库”造成误解

当前仓库里存在多份图标资产，职责必须分清楚：

| 目录/来源 | 定位 | 是否被业务代码引用 | 是否应提交 |
|---|---|---|---|
| `packages/uikit/src/assets/icons/**` | **运行时唯一图标库**。`EmIcon` / `icon-map.ts` 只认这里。 | ✅ 是 | ✅ 必须提交 |
| `packages/uikit/src/assets/icons-next/**` | 设计师交付的**新版候选素材库**，用于补充/替换 `assets/icons`。 | ❌ 不应被直接引用 | ⚠️ 当前未跟踪，建议保留为工作区参考，但不应长期作为运行时来源 |
| `线性/icon/stroked/**` | 设计源文件（设计师本地工作产物）。 | ❌ 否 | ❌ `.gitignore` 已排除 |
| `面性/icon/filled/**` | 设计源文件（设计师本地工作产物）。 | ❌ 否 | ❌ `.gitignore` 已排除 |
| `消息状态以及未读状态/**` | 设计师针对“消息已读/未读 + 未读数胶囊”的新规范素材。 | ❌ 否 | ❌ `.gitignore` 已排除 |

**核心原则**：

> `assets/icons` 是唯一权威运行时目录；`icons-next` 及其他设计源目录只是“输入素材”，任何进入产品的图标都必须经过评估后复制/替换到 `assets/icons`，并在 `icon-map.ts` 中注册。

这样就不会出现“代码里引了 icons-next 的图标但打包后找不到”或“开发者不知道用哪个目录”的混乱。

## 2. 为什么必须合并而不是并行

- `assets/icons` 有 224 个 SVG，`icons-next` 有 141 个 SVG，两者不是简单超集关系。
- `icons-next` 中部分图标与 `assets/icons` 同名但造型不同，直接整体覆盖会导致未经验证的视觉回归。
- 如果保留两套目录，业务代码极易写错 import 路径；lint/类型检查也无法发现运行时缺失。
- 合并后，`icons-next` 可以清空或定期同步设计师最新交付，而 `assets/icons` 始终代表“当前产品正在使用的图标集合”。

## 3. 合并流程（批次化 + 可追溯）

执行合并时按以下步骤操作，不要一次性全量替换：

### 步骤 1：建立分类映射表

以业务语义为维度，把 `icons-next` 与 `assets/icons` 按 `category/name` 对齐。例如：

```text
icons-next/rect/minus.svg      → assets/icons/rect/minus.svg      （新增/替换）
icons-next/actions/plus.svg    → assets/icons/actions/plus.svg    （需对比差异）
icons-next/status/done_all.svg → assets/icons/status/done_all.svg （需人工审查语义）
```

### 步骤 2：脚本化对比同名 SVG

使用 SVG 结构/视觉 diff 工具快速识别“同名但不同形”的图标：

```bash
# 示例：对比同名文件差异
for f in $(find packages/uikit/src/assets/icons-next -name '*.svg'); do
  rel=${f#packages/uikit/src/assets/icons-next/}
  if [ -f "packages/uikit/src/assets/icons/$rel" ]; then
    echo "DIFF: $rel"
    # 可接入 svg-visual-diff 或比较 viewBox/path 摘要
  fi
done
```

差异类型：

- **造型完全一致或仅描边/填充属性归一化不同**：可直接替换。
- **造型明显不同但语义一致**：人工 review 后替换，并记录变更原因。
- **语义不一致**（如同名但含义不同）：不要替换，应与设计师确认新命名。

### 步骤 3：评估缺失资源

`assets/icons` 有但 `icons-next` 没有的图标，说明设计师素材库尚未覆盖，应列出清单反馈给设计师。典型类别：

- 纯线条图形（arrow/chevron/check/xmark/plus/minus/loading 等）—— 本身无面性变体，可维持线性。
- 业务专用图标（如某些历史功能 icon）—— 需要设计师补充或确认废弃。

### 步骤 4：复制 + 规范化 + 注册

通过评估的图标：

1. 从 `icons-next` 复制到 `assets/icons` 的对应目录。
2. 将 SVG 中硬编码颜色（如 `fill="black"` / `stroke="black"`）改为 `currentColor`，确保跟随主题色。
3. 在 `icon-map.ts` 中确认已注册（新增文件会被 `import.meta.glob` 自动扫描，但命名需符合约定）。
4. 运行类型检查和构建：
   - `pnpm -F @easemob/uikit exec vue-tsc --noEmit`
   - `pnpm -F @easemob/uikit build`

### 步骤 5：业务组件验证

替换/新增图标后，必须在使用处验证：

- 图标尺寸不变（viewBox 一致）。
- 颜色跟随主题（currentColor 生效）。
- 无视觉错位、模糊、截断。

## 4. 命名与目录规范

- 统一使用 `category/name.svg` 两级结构，不要出现 `icons-next/rect/minus.svg` 与 `assets/icons/rect/minus_2.svg` 这种无法对齐的命名。
- 新图标命名优先与设计师目录命名保持一致，若 `assets/icons` 中已有同名但语义不同，应协商改名而不是共存两套命名。
- 状态类、胶囊类图标命名参考 `DIGITAL-CAPSULE-ICON-RESEARCH.md` 的规范，避免再次产生“未读数一大坨”的误用。

## 5. 建议的落地节奏

1. **第一批（高优）**：补全当前业务已引用但 `assets/icons` 中效果不佳的图标，如群成员添加 `rect/minus`、视频发送 `misc/triangle_in_rect`、消息状态/未读数胶囊等。**这一批已完成的部分不再重复替换**。
2. **第二批（中优）**：按分类批量 review `icons-next` 与 `assets/icons` 的同名片，造型一致则替换，造型不一致则记录。
3. **第三批（低优）**：面性图标集 `iconStyle` 主题切换接入（详见 `ICON-STYLE-SYSTEM-RESEARCH.md`）。
4. **长期**：设计师后续交付的新图标统一放入 `icons-next`，按本策略评估后再合并入 `assets/icons`。

## 6. 与现有研究文档的关系

- `ICON-STYLE-SYSTEM-RESEARCH.md`：负责“面性 vs 线性”风格切换的技术方案。
- `DIGITAL-CAPSULE-ICON-RESEARCH.md`：负责“消息状态 + 未读数胶囊”的视觉规范。
- 本文档：负责“设计师素材库 → 运行时图标库”的合并工作流，避免来源混乱。

## 7. 当前未处理清单（示例模板）

| 来源目录 | 文件名 | 建议动作 | 阻塞原因/备注 |
|---|---|---|---|
| `icons-next` | `status/done_all.svg` | 待对比 | 需确认与现有已读态语义一致 |
| `icons-next` | `messages/read_receipt.svg` | 待命名对齐 | 与 `assets/icons/status/done_all.svg` 可能重复 |
| `消息状态以及未读状态` | `filled=off, size=normal, num=units, stroked=on.svg` | 待接入 | 需按尺寸规范映射到未读数组件 |

> 实际执行时把上表作为 checklist，逐条 review 后勾选。
