# Vue3 UIKit 打包发布与构建契约（build / SDK 引入模式 / 产物结构）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-release-build**。

## 触发词

- `构建` / `build` / `vite build` / `vue-tsc` / `类型检查`
- `发布` / `npm publish` / `打包` / `产物` / `dist`
- `SDK 引入` / `sdk:use-tgz` / `sdk:use-npm` / `sdk:up` / `pnpm overrides`
- `resolver` / `auto-imports` / `按需引入` / `unplugin`
- `版本注入` / `__EASEMOB_UIKIT_VERSION__` / `__EASEMOB_SDK_VERSION__`

## 目标

仓库的构建/发布硬事实：**验证门禁**（类型检查 + 构建，不是 lint 全绿）、**产物结构**
（ES + UMD + 类型 + theme.css + resolver/auto-imports 轻量子包）、**SDK 双引入模式**
（npm 生产 / tgz 联调）、**构建期图标引用校验**与**版本注入**。避免五类翻车：

1. 只跑 lint 就当验证通过；
2. 改公开 API 后不重建 dist，demo 的 vue-tsc 还在读旧类型；
3. `sdk:use-tgz` 联调后把 `pnpm.overrides` 误提交；
4. 发布前不 build，或把 dev 产物/本地 tgz 打进发布包；
5. 手动改 dist 产物文件。

## 1. 验证门禁（提交前必做，AGENTS 规则）

- 类型检查：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit`（0 错误）；
- 构建：`pnpm -F @easemob/uikit-im build`（约 9s，链路见 §2）；
- demo 类型检查：`cd apps/demo && pnpm exec vue-tsc --noEmit`；
- **demo 运行时走 vite alias 直连 `packages/uikit-im/src` 源码**（改 src 刷新即生效），
  但 demo 的 `vue-tsc` 解析的是**已构建的 dist 类型**——改公开 API（props/emits/导出）后
  必须先重建 dist，否则 demo 类型检查与运行时不一致。
- **版本号同步**：发版改版本号时，`packages/uikit-im/package.json` 的 `version` 必须与根
  `CHANGELOG.md` 最新版本段（`## x.y.z (日期)`）一致；提交前跑 `pnpm changelog:check`
  （`scripts/check-version-sync.mjs`：校验 package.json 与根 CHANGELOG 一致、版本段降序无重复、
  文档站 `apps/docs/guide/changelog.md` 无手写版本段）。根 CHANGELOG 是唯一版本数据源，
  文档站通过 `@include` 引用，禁止再单独维护文档站版本段。

## 2. 构建链路与产物结构（`packages/uikit-im`）

### 2.1 build 脚本

`node scripts/check-icon-refs.mjs` → `vite build`（主库）→ `vite build --config vite.aux.config.ts`
（轻量子包）→ `vue-tsc --emitDeclarationOnly --project tsconfig.build.json`（类型产物）。

### 2.2 主构建（vite.config.ts）

- lib entry `src/index.ts`，formats `['es', 'umd']`，fileName `easemob-uikit-im.js` /
  `easemob-uikit-im.umd.cjs`，全局名 `EasemobUIKit`；
- `external: ['vue', 'pinia', 'easemob-websdk']`（配合 peerDependencies）；
- `output.exports: 'named'`（同时有命名导出与 default 导出时显式声明，避免 Rollup 警告
  "Consumers will have to use EasemobUIKit.default"；`install` 是命名导出，UMD 用户可直接
  `app.use(EasemobUIKit)`）；globals：`Vue` / `Pinia` / `Easemob`（SDK）；
- `cssCodeSplit: false` + `assetFileNames`：`style.css` 重命名为 `theme/index.css`（导出路径
  `@easemob/uikit-im/theme` 指向它）；
- 版本注入：`define` 注入 `__EASEMOB_SDK_VERSION__` / `__EASEMOB_UIKIT_VERSION__`
  （构建期读 sdk 与 uikit 的 package.json，向上查找兼容 SDK 新旧入口）；
- `vite-plugin-dts`：`insertTypesEntry: true` 生成 `dist/index.d.ts`，
  `exclude: ['*.config.ts', 'src/histoire-setup.ts']`。

### 2.3 轻量子包（vite.aux.config.ts）

- `@easemob/uikit-im/resolver`（EasemobUIKitResolver，unplugin-vue-components）与
  `@easemob/uikit-im/auto-imports`（EasemobUIKitImports，unplugin-auto-import）单独打包，
  避免混进全量 bundle 导致 tree-shaking 不友好；
- `emptyOutDir: false`——**必须保留主构建产物**，不能清空 dist。

### 2.4 package.json 契约

- `main` = umd.cjs / `module` = es / `types` = index.d.ts；`exports` 含 `.` / `./resolver` /
  `./auto-imports` / `./theme`（`./theme` 直接指向 `dist/theme/index.css`）；
- `files: ["dist"]`——发布只带 dist；
- `peerDependencies`: `pinia ^2.1.0`、`vue ^3.3.0`；`dependencies`:
  `@tiptap/* ^3.30.0`、`@vueuse/core ^14.4.0`、`easemob-websdk ^5.0.0`；
- `tsconfig.build.json`：extends 主 tsconfig，exclude `node_modules` / `dist` / `*.config.ts`。

## 3. 构建期图标引用校验（`scripts/check-icon-refs.mjs`）

- 扫描 `packages/uikit-im/src` 下所有 `.vue` / `.ts`（**含 `*.story.vue`，它们也真实渲染**），
  提取 `EmIcon` 的 name 引用（`name="分类/图标名"`、`:name="'...'"`、TS 里 `icon: '...'`），
  与 `src/assets/icons` 下实际 SVG 比对；
- 缺失引用**非零码退出**，避免图标拼错/删漏后静默不渲染；
- 识别方式：匹配形如 `'分类/图标名'` 的字符串字面量，且分类必须是 assets/icons 下真实
  存在的目录（不会误报 `'text/plain'` 等无关字符串）；
- **已知局限**：动态拼接的 name（如 `icon: 'actions/' + type`）无法静态扫描，依赖 code
  review 与运行期 EmIcon 的 miss warn 兜底；
- 独立运行：`cd packages/uikit-im && pnpm run icons:check`。

## 4. SDK 双引入模式（根 `scripts/switch-sdk.mjs`）

- **npm 模式（默认/生产）**：`easemob-websdk` 子包依赖声明恒为 `^5.0.0`（跟随 5.x 正式版
  与 beta 线），发布与构建使用 npm registry 包；
- **tgz 模式（dev 联调）**：根 `package.json` 的 `pnpm.overrides` 指向
  `file:./easemob-websdk-5.0.0.tgz`，本地安装/构建全部使用 tgz 内容，**不改子包依赖声明**；
- 命令：`pnpm sdk:use-tgz` / `pnpm sdk:use-npm` / `pnpm sdk:status` / `pnpm sdk:up`
  （= `pnpm up easemob-websdk`，更新到 range 内最新版并更新 lockfile）；
- **切换后必须重新 `pnpm install` 生效**（可加 `--install` 自动重装）；
- 检查当前模式：`pnpm sdk:status`；tgz 模式仅影响本地安装/构建，发布不受影响。

## 5. 根 workspace 与常用脚本（pnpm 9 / pnpm-workspace.yaml）

- workspace：`packages/*`（@easemob/uikit-im）+ `apps/*`（demo / docs）；
- 根脚本：`build` = `pnpm -r build`；`dev` = `pnpm -F @easemob/uikit-im story:dev`（Histoire）；
  `test` = vitest；`lint` = `eslint .`；`format` = `prettier --write .`；
- `packageManager: pnpm@9.12.3`；`engines.node >= 18`；
- **提交前检查**：`git diff --cached --name-only | grep -E 'dist/|node_modules/|\.tgz$'`
  应为空（`dist/` 已 gitignore，但 tgz 模式改动的根 package.json 是真实 diff）。

## 硬规则 vs 软约定

**硬规则：**

- 验证门禁是**类型检查 + 构建**（0 错误），不是 lint 全绿。
- 改公开 API 后必须重建 dist（demo 类型检查解析 dist 类型）；改 src 内部实现无需重建。
- 发布前必须 `pnpm -F @easemob/uikit-im build`，发布包只含 `dist`（files 白名单）。
- 构建失败（含图标引用缺失）不允许绕过/注释校验强行发布。
- 本地 tgz 联调后切回 npm 模式并 `pnpm install` 验证，禁止把 `pnpm.overrides` 提交上去。

**软约定：**

- 版本号只改 `packages/uikit-im/package.json` 的 `version`（构建期自动注入产物与类型）；
  根 package.json 的 version 是 workspace 私有的，不随包发布。
- `sdk:use-tgz` 前确认根目录存在对应 tgz（脚本会检查并提示）。

## 已知漂移（改到相关文件时注意）

- `easemob-websdk` 依赖声明是 `^5.0.0`（README 中写 `^5.0.0-beta.1` 的旧描述已过时），
  以 `packages/uikit-im/package.json` 为准。
- `contactFetchMode: 'page'` 目前 SDK 未暴露分页游标接口，实际按全量返回处理（与构建无关，
  但涉及发布文档措辞）。
- UMD 产物 `easemob-uikit-im.umd.cjs` 是 CJS 扩展名 + UMD 格式（Vite 命名约定），不要改成
  `.umd.js` 或 `.cjs` 单格式。

## 反面清单

- ❌ 只跑 `pnpm lint` 就提交——门禁是类型检查 + 构建。
- ❌ 改完 props/emits/导出不重建 dist——demo vue-tsc 报错或类型过期。
- ❌ `sdk:use-tgz --install` 后直接提交——根 package.json 带上了 overrides。
- ❌ 发布前不 build / 用 story 产物当库产物。
- ❌ 手动改 dist 里任何文件——一律由 build 重新生成。
- ❌ 在 resolver/auto-imports 子包里塞组件本体——破坏轻量子包设计。
- ❌ `git add` 把 `easemob-websdk-*.tgz` / `easemob-uikit-im-*.tgz` 当发布源——仓库根 tgz 仅联调用。
