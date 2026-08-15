# Vue3 UIKit 仓库的 lint 治理与非代码改动层决策

## 触发词

- `跑 lint` / `处理 eslint`
- `lint 治理` / `清 lint`
- `eslint 报一堆错`
- `改 eslint 配置` / `放宽规则`
- `迁移收尾` / `提交前检查`
- `for 什么规则要不要修`

## 目标

在 `easemob-uikit-vue`（pnpm workspace，`@easemob/uikit-im` 为核心包）里处理 eslint 时，
**快速区分「该修的代码问题」「该改的配置约定」「不该动的既有债」**，避免两种典型错误：

1. 把仓库既有的全局风格债当成本次改动引入的问题，无谓 `--fix` 上百个未改动文件、制造巨大 diff；
2. 把与项目一致约定冲突的规则用「改代码」硬顶，破坏公开 API 或删掉半成品功能。

> lint「全绿」不是现实目标，也不该作为改动的验收门禁。真正的门禁是 **类型检查 + 构建**。

## 工具链事实（先记住，省掉重新踩坑）

- eslint 配置是 **`@antfu/eslint-config` flat config**（根目录 `eslint.config.js`）。
  - `--ext` 参数**无效**，会直接报错；给 eslint 传**具体文件/目录路径**即可（按 flat config 的 globs 自动判定）。
  - 追加规则覆盖：`antfu({...}, { files: [...], rules: {...} })`，第二个及之后的参数是普通 flat config 块。
- 仓库 lint **基线本来就不干净**：`pnpm exec eslint packages/uikit-im/src` 全量约 1400+ 条，
  其中约 **89% 可被 `--fix` 自动修复**（`antfu/if-newline`、`format/prettier`、`sort-imports`、
  `import/order`、`style/comma-dangle`、`ts/method-signature-style`、`style/brace-style` 等）。
  连从未被本次改动碰过的基础组件（`components/button/button.vue`、`utils/linkify.ts` 等）也报错。
- antfu 的 `no-console` **允许 `console.warn` / `console.error`，只禁 `console.log/info/debug`**。
  → 该保留的错误/警告日志降级为 `warn`/`error` 即可过；纯调试日志才删。
- 空函数体只要**含注释**就不触发 `no-empty-function`：`onFoo: () => { /* 说明为何空实现 */ }`。
- macOS 自带 **bash 3.2 没有 `mapfile`**，用 `while read` 或命令替换词分割代替。
- 验收命令：
  - 类型检查：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit`（0 错误为准）
  - 构建：`pnpm -F @easemob/uikit-im build`（= `vite build && vue-tsc --emitDeclarationOnly`）

## 精确圈定改动范围（含一个真实盲区）

**盲区**：`git status --short | grep '^ M'` **只抓 modified，漏掉未跟踪（`??`）的新增文件**。
一次大改如果新建了很多文件（如 `sdk/domain`、`sdk/event`、拆分的 composables），只按 `^ M`
统计/`--fix` 会**漏掉全部新增文件**，得到虚低的「剩余条数」。

推荐配方：

```bash
# 已提交后：列出本次提交涉及、且当前仍存在的源码文件（删除的路径传给 eslint 会报错吞输出）
git diff-tree --no-commit-id --name-only -r HEAD \
  | grep -E 'packages/uikit-im/src/.*\.(ts|vue)$' \
  | while read f; do [ -f "$f" ] && echo "$f"; done > /tmp/changed.txt

# 只对这批文件跑 / 修
pnpm exec eslint $(cat /tmp/changed.txt)
pnpm exec eslint --fix $(cat /tmp/changed.txt)

# 未提交前：用 git status，但要同时纳入未跟踪文件
git status --short | grep -E '^( M|\?\?|A )' | awk '{print $2}' | grep -E 'packages/uikit-im/src/.*\.(ts|vue)$'
```

按规则分布快速看清「还剩什么」：

```bash
pnpm exec eslint $(cat /tmp/changed.txt) 2>/dev/null \
  | grep -oE '[a-z-]+/[a-z-]+$|no-console|no-cond-assign|no-alert' | sort | uniq -c | sort -rn
```

## 决策树：改代码 / 改配置 / 不动

### A. 先分「本次引入」还是「既有债」

- **既有债**（未改动文件也报、全仓库同规则大量命中）→ **不动**，不在本次范围。
  别为了「好看」`--fix` 未改动文件。
- **本次引入**（只在改动文件里、由这次重构产生）→ 继续往下判断。

### B. 可自动修复的风格类 → 直接 `--fix`

`if-newline`、`prettier`、`sort-imports`、`import/order`、`comma-dangle`、`brace-style`、
`member-delimiter-style`、`arrow-parens`、`method-signature-style` 等，`--fix` 后复跑类型检查确认没改坏。

### C. 语义类，逐条判断

| 规则 | 处理方式 |
| --- | --- |
| `unused-imports/no-unused-imports` | 删导入 |
| `unused-imports/no-unused-vars`（真死代码）| 删；确属预留参数则前缀 `_` |
| `no-console`（真实逻辑文件）| 调试日志删；错误/警告降级 `console.warn`/`console.error` |
| `no-console` / `no-alert`（`*.story.vue`）| **改配置**放开，见 D（histoire 演示代码，合理） |
| `regexp/no-unused-capturing-group` | 捕获组改非捕获 `(?:...)` |
| `no-cond-assign` | 把 `while ((m = re.exec()))` 拆成循环外首次赋值 + 循环末重新赋值 |
| `ts/no-use-before-define`（SFC ref）| 把被提前引用的 `ref`/`const` 声明**上移**到首次使用前 |
| `ts/no-unused-expressions` | 删无副作用的占位表达式语句 |

### D. 规则与「项目一致且刻意」的约定冲突 → 改配置对齐（而不是改代码）

- **公开事件命名**：UIKit 组件对外事件统一 **kebab-case**（`send-success`、`max-exceed`、
  `mention-click`…），与 antfu 默认 camelCase 冲突。改成 kebab-case 会破坏所有调用方。
  → 配置对齐：`'vue/custom-event-name-casing': ['error', 'kebab-case']`。
- **story 演示**：`**/*.story.vue` 里的 `console` / `alert` 是交互演示，合理。
  → 配置覆盖：`{ files: ['**/*.story.vue'], rules: { 'no-console': 'off', 'no-alert': 'off' } }`。

判据：**全项目一致、且是有意为之的对外契约/演示** → 改配置；**孤立离群点** → 改代码。
（例：设成 kebab-case 后只剩一个 `customAction` 违规，它是唯一 camelCase 事件、且无监听方
→ 改代码把它改成 `custom-action`。）

### E. 半成品功能 → 标注保留，别删也别硬接

发现计算了却没被消费的逻辑（如群已读回执 `enableGroupAck` 算好但 `domain.sendText` 未透传）：
- **不要**为了过 lint 直接删掉功能骨架；
- **不要**用 `as any` / 猜 SDK 参数硬接（那是功能补全，属另一轮工作）；
- 用 `_` 前缀 + TODO 注释保留意图，并**在收尾时明确告知用户**这处待接通。

## 收尾与提交约定

- 顺序：**先验证（类型检查 + 构建）→ 再提交**。
- commit message 用**中文**；**不要 `git push`**、不做其它 git 变更（除非用户明确要求）。
- 暂存后确认没混入产物/依赖：
  `git diff --cached --name-only | grep -E 'dist/|node_modules/|\.tgz$'`（应为空）。
- 大改动可分轮提交（如「迁移主体」一轮、「lint 治理」一轮），每轮都各自跑过验证。

## 反面清单（这次踩过/要避免）

- ❌ 只按 `^ M` 统计，漏掉新增文件，报出虚假的「剩余条数」。
- ❌ 把已删除文件路径传给 eslint（报错并吞掉正常输出）。
- ❌ 对全仓库 `--fix` 来「清零」，把上百个未改动文件卷进 diff。
- ❌ 为过 `vue/custom-event-name-casing` 去重命名公开事件，破坏调用方。
- ❌ 删掉半成品功能骨架或用 `as any` 硬接来消除 unused 告警。
