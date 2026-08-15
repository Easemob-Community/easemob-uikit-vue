# 常见坑与硬规则（gotchas）

## 安装 / 依赖

- ❌ 只装 `@easemob/uikit` 不装 `pinia` / `vue`——它们是 peerDependencies，运行时 pinia 缺失报错。
- ✅ `pnpm add @easemob/uikit pinia vue`。
- ❌ 忘记 `app.use(createPinia())`——UIKit 组件内部 store 依赖 pinia 实例。
- ✅ `EmUIKitProvider` **不自带 pinia**，必须项目自行注册。
- ✅ 入口已内置主题样式，**无需**再 `import '@easemob/uikit/theme'` 之类的 CSS。

## 组件与 Provider

- ❌ 把业务组件写在 `<EmUIKitProvider>` 之外——store 未注入，组件不渲染或报错。
- ✅ `EmUIKitProvider` 是顶级容器，所有业务组件写在其内部。
- ❌ 忘记 `appKey` 或格式错——SDK 无法初始化，登录失败。格式为 `orgName#appName`。
- ✅ 组件统一 `Em` 前缀：具名导出 `EmButton`、`EmChatContainer`；模板 `<em-button>` / `<EmChatContainer>`。

## 登录与初始化

- ✅ 两种方式：`EmUIKitProvider` 声明式（推荐），或 `useClient()` 手动 `init/login/logout`。
- ✅ `login({ accessToken })` 或 `login({ userId, password })`。
- ✅ 延迟初始化：`<EmUIKitProvider :auto-init="false">` 后调用 `useClient().init({ appKey })`。
- ✅ Token 过期用 `onTokenWillExpire` / `onTokenExpired` prop 回调刷新/重登。
- ⚠️ `EmUIKitProvider` **不对外 emit 事件**（无 `ready`），初始化状态用 `useUIKitProvider()` 获取。

## 事件与命名

- ✅ 公开事件统一 **kebab-case**：`@conversation-click`、`@update:xxx` 等。

## 主题 / 样式

- ✅ 覆盖 `:root` 的 `--uikit-*` 变量全局生效；暗色用 `[data-uikit-theme="dark"]`。
- ✅ 运行时定制用 `useTheme()`；声明式用 Provider `theme` prop。
- ⚠️ 旧版 `--em-*` 变量已废弃，统一 `--uikit-*`。

## H5

- ❌ 业务组件里自己监听 `resize` / `visualViewport` / `keyboard`——H5 状态统一来自 `useUIKit().h5`。
- ✅ 用 Provider `h5` prop 开启安全区/键盘/下拉刷新。

## 国际化

- ✅ Provider `locale="zh-CN" | "en"`，或运行时 `useLocale().setLocale('en')`。
- ✅ 扩展/覆盖文案用 `mergeLocaleMessages(locale, {...})`；反查 key 用 `findLocaleKey(text)`。

## 版本与契约

- ⚠️ 组件库为**预览版（Preview）**，对外 API 仍可能调整，接入生产前确认当前版本。
- ✅ 从历史版本迁移关注：`UIKitProvider` 取代旧初始化写法、组件统一 `Em` 前缀、主题变量 `--uikit-*`。
