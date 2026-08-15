---
name: easemob-uikit-integration
description: 在 Vue3 项目中集成环信 Easemob UIKit（npm 包 @easemob/uikit-im）时使用。覆盖安装与全局注册、Em 前缀组件、按需引入 resolver、EmUIKitProvider 配置（appKey / features 功能开关 / dataSource 数据源接管 / theme / h5 / notification / logger / token 过期回调）、组合式函数（useClient / useChat / useConversation / useTheme / useUserInfo 等）、主题定制（CSS 变量与暗色模式）、H5 适配与常见坑。当用户提到「接入 UIKit」「集成环信 IM」「@easemob/uikit-im」「UIKitProvider」「Em 前缀组件」「会话列表/聊天/通讯录/群组容器」「主题定制」「H5 适配」「useClient 登录」等时加载本技能。
---

# 环信 Easemob UIKit 集成指南（@easemob/uikit-im / EmUIKitProvider / Em 前缀组件）

> 命中本技能时，先说一句：**本次命中 skill: easemob-uikit-integration**。

本技能面向**把 `@easemob/uikit-im` 接入自己 Vue3 项目的下游开发者**（由 AI 协助写集成代码时使用）。
它只描述**发布包的对外契约**，不含 UIKit 仓库内部实现细节。

## 何时使用

- 用户要在 Vue3 项目里安装并接入 `@easemob/uikit-im`，搭建 IM 界面；
- 用户要写 `EmUIKitProvider`、`EmChatContainer`、`EmConversationContainer` 等容器/组件；
- 用户要定制主题、暗色、H5 适配、国际化，或手动 `useClient()` 登录；
- 用户报错：「组件不渲染」「登录失败」「pinia 报错」「样式没生效」等集成类问题。

## 核心接入链路（先看这个）

最小可运行接入只有三步，详见 `reference/quickstart.md`：

1. `pnpm add @easemob/uikit-im pinia vue`（`pinia`、`vue` 是 peerDependencies，**必须显式安装**）；
2. `main.ts` 里 `app.use(createPinia()).use(UIKit)`；
3. 用 `<EmUIKitProvider app-key="...">` 包住业务容器（`<EmChatContainer />` 等）。

## reference 子文件索引（按需读取）

| 文件 | 内容 | 何时读 |
| --- | --- | --- |
| `reference/quickstart.md` | 安装 / 全局注册 / 按需引入 / 最小接入 / useClient 登录 | 任何接入任务先读 |
| `reference/provider.md` | EmUIKitProvider 全量配置：features / dataSource / theme / h5 / notification / logger / token | 配置 Provider 时读 |
| `reference/components.md` | 组件清单与分类、Em 前缀约定、resolver、业务容器 | 选组件 / 写业务容器时读 |
| `reference/theming.md` | CSS 变量 / useTheme / 暗色 / 密度 / 字号 | 定制主题时读 |
| `reference/h5.md` | 安全区 / 键盘 / 下拉刷新 / 长按 / 页面栈 | 移动端适配时读 |
| `reference/gotchas.md` | 高频集成坑与硬规则 | 排查问题、收尾自查时读 |
| `reference/api/*.md` | 组件 props / emits / slots 明细（由 `scripts/gen-skill.mjs` 同步，勿手改） | 查具体组件 API 时读 |

## 关键契约速查（最常被问到的硬规则）

- **组件统一 `Em` 前缀**：具名导出 `EmButton`、`EmChatContainer`…；模板里全局注册后可用 `<em-button>` / `<EmChatContainer>`。
- **`EmUIKitProvider` 是顶级容器**：所有业务组件必须在其内部渲染；`appKey` 必填（格式 `orgName#appName`）。
- **Provider 不自带 pinia**：项目必须自行 `app.use(createPinia())`。
- **入口已内置主题样式**：`@easemob/uikit-im` 无需再单独 `import '...css'`。
- **登录两种方式**：`EmUIKitProvider` 声明式（推荐），或 `useClient()` 手动 `init/login/logout`。
- **事件统一 kebab-case**：如 `@conversation-click`。
- **组件库为预览版（Preview）**：对外 API 仍可能调整，回答时提示用户以当前文档为准。

## 硬规则 vs 软约定

**硬规则：**

- 集成侧只描述 `@easemob/uikit-im` 发布包的对外契约，不写仓库内部实现（build/lint/TECH-DEBT 等）。
- `pinia`、`vue` 是 peerDependencies，接入方必须显式安装；Provider 不自带 pinia。
- 组件名统一 `Em` 前缀；自定义前缀走 `app.use(UIKit, { prefix })` 或 resolver `prefix`。
- 组件 API 明细以 `reference/api/*.md` 为准，这些文件由 `scripts/gen-skill.mjs` 从文档源生成，**禁止手改**。

**软约定：**

- 优先给出 `EmUIKitProvider` 声明式写法，`useClient()` 作为补充。
- 示例默认 `appKey` 用占位 `your-app-key`，提醒替换为真实 AppKey。
- 回答涉及不确定的 API 时，先查 `reference/api/*.md`，不要凭印象编 props。

## 反面清单

- ❌ 不装 `pinia` / `vue` 就 `app.use(UIKit)`——运行时 pinia 缺失报错。
- ❌ 把业务组件写在 `<EmUIKitProvider>` 之外——store 未注入，组件不渲染。
- ❌ 忘记 `appKey`（或格式错）——SDK 无法初始化，登录失败。
- ❌ 手改 `reference/api/*.md`——下次 `gen-skill.mjs` 重跑会被覆盖。
- ❌ 凭印象编造 props/emits——以 `reference/api/*.md` 为准。
- ❌ 把仓库内部 `.agent/skills/*`（维护者技能）当成本技能的来源——本技能面向下游接入者。
