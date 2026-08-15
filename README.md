# easemob-uikit-vue

![status](https://img.shields.io/badge/status-预览版%20Preview-orange) ![version](https://img.shields.io/badge/version-v1.8.0-blue)

> [!WARNING]
> **当前为预览版本（Preview），尚未正式发布。**
>
> - 欢迎先行体验：查看源码、本地运行文档站与 demo，了解实现思路与组件能力；
> - 有任何建议、疑问或发现的问题，欢迎提交 **Issue / PR**，我们会认真评估每一条反馈；
> - 正式版（Stable）将于后续发布，正式发布前 **API 与行为可能调整**，暂不建议直接用于生产环境。

环信 Vue3 UIKit 组件库，基于 `easemob-websdk`（SDK5）构建，提供可复用的 IM UI 组件与业务模块。

## 特性

- Vue 3.3+ Composition API
- Pinia 状态管理
- TypeScript 严格模式
- H5 适配（安全区、软键盘、下拉刷新、长按交互）
- 主题定制

## 快速开始

```bash
pnpm install @easemob/uikit-im
```

```ts
import { createApp } from 'vue'
import UIKit from '@easemob/uikit-im'
import '@easemob/uikit-im/theme' // 引入主题样式（构建产物 CSS 提取为独立文件，需手动引入）
import App from './App.vue'

const app = createApp(App)
app.use(UIKit)
app.mount('#app')
```

## H5 适配

在 `<UIKitProvider>` 上配置 `h5` 属性即可一键开启移动端适配：

```vue
<UIKitProvider
  :h5="{
    safeArea: true,
    keyboardAdapt: true,
    pullRefresh: 'auto',
  }"
>
  <EmChatContainer />
</UIKitProvider>
```

详见 [H5 适配指南](./apps/docs/guide/h5-adaptation.md)。

## 文档

```bash
pnpm -F @easemob/docs dev
```

## SDK 引入模式

`easemob-websdk` 支持两种引入方式：默认使用 npm registry 版本（生产/发布），本地联调可切换为仓库内的 tgz 包（便于测试未发布的 SDK 构建）。

| 命令               | 模式        | 说明                                                                                            |
| ------------------ | ----------- | ----------------------------------------------------------------------------------------------- |
| `pnpm sdk:use-npm` | npm（默认） | 使用 npm registry 的 `easemob-websdk@^5.0.0-beta.1`（跟随 5.x 正式版与 beta 线），生产/发布环境 |
| `pnpm sdk:use-tgz` | tgz（dev）  | 通过 pnpm overrides 指向根目录 `easemob-websdk-5.0.0.tgz`，本地联调                             |
| `pnpm sdk:up`      | -           | 一键将 SDK 更新到 range（`^5.0.0-beta.1`）内最新版并更新 lockfile                               |
| `pnpm sdk:status`  | -           | 查看当前模式                                                                                    |

切换后需重新执行 `pnpm install` 生效（可加 `--install` 自动重装，如 `pnpm sdk:use-tgz --install`）。tgz 模式仅影响本地安装/构建（overrides 只在仓库根生效），不会改变子包 `package.json` 中的依赖声明，发布不受影响。

## 开发验证

```bash
# 类型检查
pnpm -F @easemob/uikit-im exec vue-tsc --noEmit

# 构建
pnpm -F @easemob/uikit-im build

# demo 类型检查
cd apps/demo && pnpm exec vue-tsc --noEmit
```
