# Vue3 UIKit 的 H5 适配规范

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-h5-adaptation**。

## 触发词

- `H5 适配` / `移动端适配` / `手机适配`
- `安全区` / `刘海屏` / `safe-area`
- `键盘顶起` / `键盘高度` / `keyboard`
- `下拉刷新` / `pull-refresh` / `touch 事件`
- `长按` / `long-press` / `touchmove`
- `viewport` / `is-mobile` / `font-scale`

## 目标

在 `easemob-uikit-vue`（核心包 `@easemob/uikit-im`）里新增或修改 H5/移动端相关能力时，
保证状态来源、CSS 变量契约、组件接入方式一致，避免每个组件自己监听 `resize/visualViewport/touch`。

## 1. 对外入口：`<UIKitProvider :h5="config">`

用户只需要在 Provider 上挂一个 `h5` 配置对象，所有子组件自动感知：

```vue
<UIKitProvider
  :h5="{
    safeArea: true,          // 是否启用 env(safe-area-inset-*) 安全区
    keyboardAdapt: true,     // 是否把软键盘高度同步给输入组件
    pullRefresh: 'auto',     // true | false | 'auto'，是否开启下拉刷新
    fontScale: 1,            // P2 预留：整体字号缩放系数
  }"
>
  <EmChatContainer />
</UIKitProvider>
```

`uikit-provider.vue` 会把配置实例化成**单个** `h5` 状态对象，注入 `UIKitContext`，
全局共享同一实例。

## 2. 状态中枢：`useH5Adaptation()`

H5 相关状态**集中**在 `src/composables/use-h5-adaptation.ts`：

```ts
const { h5 } = useUIKit()
h5.viewport        // { width, height }
h5.isMobile        // width < 768
h5.safeAreaInsets  // { top, right, bottom, left }
h5.keyboardHeight  // 当前软键盘高度（keyboardAdapt=false 时恒为 0）
h5.isKeyboardOpen  // 键盘是否弹起
h5.enablePullRefresh // 是否应渲染下拉刷新
h5.fontScale       // P2 预留字号缩放
```

**禁止**在组件里自己 `window.addEventListener('resize', ...)` 或自己算键盘高度。
需要这些值一律从 `useUIKit().h5` 取；若要在 `UIKitProvider` 外使用（不推荐），
用 `useViewport()` / `useKeyboard()` 等底层封装，它们内部会优先尝试从 context 读取。

## 3. CSS 变量契约：`theme/index.css`

> **硬前置：宿主 HTML 的 viewport meta 必须包含 `viewport-fit=cover`**
> （如 `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`），
> 否则 iOS 上 `env(safe-area-inset-*)` 恒为 0，整套安全区适配失效。
> `useH5Adaptation` 在 `safeArea` 开启且检测到缺失时会 `console.warn` 一次提示宿主接入。

H5 安全区通过 CSS 变量透传，组件只引用变量、不直接 `env()`：

```css
/* theme/index.css :root */
--uikit-safe-top: env(safe-area-inset-top);
--uikit-safe-right: env(safe-area-inset-right);
--uikit-safe-bottom: env(safe-area-inset-bottom);
--uikit-safe-left: env(safe-area-inset-left);
--uikit-font-scale: 1;
```

当 `safeArea: false` 时，`uikit-provider.vue` 会在运行时用内联样式把这些变量覆写成 `0px`，
组件无需关心开关逻辑。

组件用法示例：

```css
.chat-header {
  padding-top: var(--uikit-safe-top, 0px);
  padding-bottom: calc(var(--uikit-safe-bottom, 0px) + 12px);
}
```

## 4. 组件接入清单（新增/修改组件时照做）

### 必须读取 `h5` 状态的场景

| 场景 | 做法 |
| --- | --- |
| 顶部 header 贴边 | `padding-top: var(--uikit-safe-top, 0px)` |
| 底部 footer/弹窗贴边 | `padding-bottom: var(--uikit-safe-bottom, 0px)` |
| 输入框被键盘顶起 | `message-input` 接收 `:keyboard-height`，结合 `h5.keyboardAdapt` |
| 下拉刷新 | `conversation-list` 等列表按 `h5.enablePullRefresh.value` 决定是否渲染 pull-refresh 壳 |
| 长按菜单/操作 | 用 `useLongPress`，禁止组件内再写一套 `setTimeout` |
| 判断移动端布局 | `h5.isMobile.value`（不要自己写 `window.innerWidth < 768`） |

### 禁止事项

- ❌ 组件内直接 `env(safe-area-inset-*)`——统一走 `--uikit-safe-*` 变量。
- ❌ 组件内自己监听 `resize/visualViewport/keyboard`——统一从 `useUIKit().h5` 取。
- ❌ 再写一版长按/下拉刷新/视口计算——已有 `useLongPress` / `usePullRefresh` / `useViewport`。
- ❌ `safeArea=false` 时还在组件里写死 `env()`——这样关不掉。

## 5. 键盘适配细节

- 键盘高度来源：`useKeyboard()`（基于 `window.visualViewport`）。
- `h5.keyboardAdapt=false` 时，`keyboardHeight` 恒为 `0`，输入框不主动上移。
- `chat.vue` 在输入框 `@focus` 时调用 `messageListRef?.scrollToBottom()`，保证键盘弹起后消息不被遮挡。
- `message-list.vue` 已 expose `scrollToBottom()`，需要时通过 ref 调用。

## 6. 动画/动效与 H5

H5 上动画应更克制，且必须接入全局动画开关：

- 过渡时长/缓动统一用 `var(--uikit-anim-duration)` / `var(--uikit-anim-easing)`，
  不要用 `0.15s` / `0.2s` 等字面量。
- 从底部弹起的 sheet（如 emoji picker）优先用 `uikit-slide-up` Vue Transition，
  而不是自己写 `@keyframes` 或硬编码 transform/opacity。

## 7. 预留接口（P2 不做，但已留口）

以下能力在 `H5AdaptationConfig` / `theme/index.css` 里已留好字段/变量，
当前仅作占位，方便后续直接实现：

- `fontScale`：整体字号缩放。
- `--uikit-font-scale`：字号 token 的缩放乘数。
- 横屏响应式：`h5.viewport` 已包含 width/height，后续可扩展断点。
- 大图手势缩放、bottom sheet 下滑关闭：未实现，但组件改时不应写死相关样式。

## 硬规则 vs 软约定

**硬规则**

- H5 状态唯一来源是 `useUIKit().h5`；Provider 内禁止组件自行监听窗口/键盘事件。
- 安全区只通过 `--uikit-safe-*` CSS 变量传递；组件禁止直接写 `env(safe-area-inset-*)`。
- 长按、下拉刷新、视口计算必须用已有封装，禁止重造。
- 过渡/动画时长必须接入 `var(--uikit-anim-*)` token。

**软约定**

- 新增需要键盘/安全区/移动态的组件，优先从 `useUIKit().h5` 读取，不要新增 props。
- 若用户需要覆盖某组件的 H5 行为，应通过 `UIKitProvider :h5` 全局控制，而非给每个组件加开关。

## 反面清单

- ❌ `window.addEventListener('resize', ...)` 直接写在组件里。
- ❌ `padding-top: env(safe-area-inset-top)` 硬编码在组件样式。
- ❌ 自己再实现一版 `useLongPress` / `usePullRefresh`。
- ❌ 输入框 focus 时不处理消息列表滚动，导致键盘遮挡。
- ❌ 把 `h5` 状态拆成多个独立 composable 注入，造成状态不同步。
