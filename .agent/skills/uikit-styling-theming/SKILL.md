# Vue3 UIKit 的样式写法与主题（CSS 变量）规范

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-styling-theming**。

## 触发词

- `改样式` / 写组件 CSS
- `主题` / `换肤` / 品牌色
- `暗色` / dark mode
- `CSS 变量` / `--uikit-*`
- `颜色 token` / 圆角 / 动效时长
- `unocss` / 原子类 / 工具类

## 目标

在 `easemob-uikit-vue`（核心包 `@easemob/uikit`，源码 `packages/uikit/src`）里写或改样式时，
**用对本库真实的样式约定，别被仓库里的「死配置」带偏**：

1. 组件样式 = `<style scoped>` + BEM 类名 + `var(--uikit-*)` CSS 变量；
2. 所有可视值（颜色 / 圆角 / 动效时长）走 `--uikit-*` token，不硬编码；
3. 主题 / 暗色 / 动画都由 `src/theme/index.css` 的变量契约 + `data-uikit-*` 属性驱动，改一处即可全局生效。

## ⚠️ 头等事实：UnoCSS 是「死配置」，本库不用工具类

`packages/uikit/uno.config.ts` 看起来很完整——配了 `presetWind` / `presetAttributify` /
`preset-rem-to-px`、`u-center` / `u-transition` 等 `u-*` shortcuts、`primary` / `text-primary` /
`rounded-uikit-*` 一整套色板 token。**但库里真实组件命中 0 次**，照它写不生效：

- 库构建 `packages/uikit/vite.config.ts` 的 `plugins` 只有 `vue()` + `dts()`，**没有挂 `unocss()`**，
  `dist/` 只产出 `dist/theme/index.css`，没有 `uno.css`。
- `virtual:uno.css` 只在 `src/histoire-setup.ts` 里 `import 'virtual:uno.css'`，**仅 Histoire 预览生效**。
- 非 story 的 `.vue` 组件里 `u-*` / attributify / `text-text-primary` / `rounded-uikit-*` 全 0 命中。

**结论：写样式不要照 `uno.config.ts` 写原子类 / attributify，写了也没用。** 该配置去留见根
`TECH-DEBT.md` 的 **D1**（倾向「移除」）。真要用原子类得先按 D1 的方案 B 把 `unocss()` 接进库构建，那是一次样式重构，不在日常改样式范围内。

## 真实样式约定：`<style scoped>` + BEM + CSS 变量

几乎所有组件都是 `<style scoped>` + `uikit-块--修饰` 的 BEM 类名；全库约 485 处 `var(--uikit-*)` 引用。
（少数文件如 `modules/chat/message-input.vue`、`modules/chat/message-input/rich-input.vue`
在 scoped 块之外**额外**带一个非 scoped `<style>`，用于全局 / 深度穿透样式；`*.story.vue` 用普通 `<style>` 属演示代码。）

真实片段 —— `src/components/button/button.vue`（颜色 / 圆角 / 动效全走 token）：

```css
.uikit-button {
  border-radius: var(--uikit-components-radius, 8px);
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
              transform 150ms var(--uikit-anim-easing);
}
.uikit-button:active:not(:disabled) {
  transform: scale(var(--uikit-anim-scale-press));
}
.uikit-button--primary { background-color: var(--uikit-primary-color); color: #fff; }
.uikit-button--default {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
}
```

真实片段 —— `src/components/input/input.vue`（`token + inline fallback` 写法，fallback 只作兜底）：

```css
.uikit-input__field {
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}
.uikit-input__field:focus { border-color: var(--uikit-primary-color); }
```

## CSS 变量契约（唯一真相源：`src/theme/index.css`）

`src/theme/index.css`（约 330 行）由 `src/index.ts` 引入，构建后产出 `dist/theme/index.css`。
`:root` 里定义了全部第一类 `--uikit-*` 变量，命名空间大致是：

- **品牌 / 语义色**：`--uikit-primary-color` / `-opacity`、`--uikit-success-color` / `-warning-color` / `-danger-color`
- **表面 / 文字**：`--uikit-bg-base` / `-bg-secondary` / `-bg-hover`、`--uikit-text-primary` / `-text-secondary`
- **边框 / 分隔**：`--uikit-border-color` / `-border-light` / `-divider-color`
- **滚动条**：`--uikit-scrollbar-width` / `-track` / `-thumb` / `-thumb-hover` / `-thumb-radius`
- **间距 / 圆角**：`--uikit-container-gap`、`--uikit-components-radius` / `-hover`、`--uikit-popup-padding` / `-hover`
- **阴影**：`--uikit-shadow` / `-hover`
- **动画**：`--uikit-anim-enabled` / `-duration`(`/-enter/-leave`) / `-easing`(`/-decel/-accel/-spring`) /
  `-scale-press` / `-scale-enter` / `-anchor-scale-enter` / `-anchor-origin-x` / `-y` /
  `-ripple-opacity` / `-ripple-duration` / `-overlay-duration` / `-stagger-delay`
- **H5 安全区（2026-07 新增）**：`--uikit-safe-top` / `--uikit-safe-right` / `--uikit-safe-bottom` / `--uikit-safe-left`；由 `UIKitProvider :h5` 控制开关，`safeArea=false` 时运行时被覆写为 `0px`。
- **H5 字号缩放（P2 预留）**：`--uikit-font-scale`（当前默认 `1`，供后续全局字号缩放使用）。

暗色与动画分级都是**属性选择器覆盖，不是纯 media query**：

- 暗色：`[data-uikit-theme="dark"]` 覆盖 `bg/text/border/scrollbar/shadow`（`data` 属性打在 `<html>` 上）。
- 动画等级：`[data-uikit-anim-level="subtle"]` / `="expressive"` 覆盖时长与缩放；
  `[data-uikit-anim-enabled="false"]` 与 `@media (prefers-reduced-motion: reduce)` 把动画全部归零。

## 运行时层：主题怎么被喂进来

- **第二类变量在运行时写**：`src/store/theme.ts` 的 `useThemeStore` 用 `watchEffect` 往
  `document.documentElement` 写 `--uikit-item-hover-*` / `--uikit-item-active-radius` / `--uikit-container-gap`
  / `--uikit-components-radius`，并把数字 hue 重算成 `--uikit-primary-color` / `-opacity`；同时切 `data-uikit-theme` / `-anim-level` / `-anim-enabled` 属性。
- **公开封装**：`src/composables/use-theme.ts` 暴露 `mode` / `effectiveMode` / `isDark` / `setMode`
  / `toggleMode` / `setPrimaryColor` / `animation*` 等；业务改主题走它，别直接摸 DOM。
- **入口**：`<UIKitProvider :theme="{ mode, primaryColor, gap, shape }" :animation>` 在
  `containers/uikit-provider/uikit-provider.vue` 的 `onMounted` 里把配置喂进 store。

## 硬规则（最该拦）vs 软约定

**硬规则**

- 组件 `<style>` 里**禁止硬编码颜色 / 圆角 / 动效时长**；一切可视值引用已存在的 `--uikit-*` token。
- token 缺了**先加进 `src/theme/index.css`**，且**必须同时补 `[data-uikit-theme="dark"]` 的暗色值**（只改 `:root` = 暗色下必出错）。
- H5 安全区**禁止直接写 `env(safe-area-inset-*)`**，统一通过 `--uikit-safe-*` 变量传递；需要开关时由 `UIKitProvider :h5` 覆写变量，组件不感知开关逻辑。
- 过渡 / 动画统一用 `var(--uikit-anim-duration / -easing)`（及 `-enter/-leave/-decel/-accel`），让全局动画开关和 reduced-motion 真正生效。
- 只在 `var(--uikit-x, fallback)` 的 fallback 位置允许出现字面量 hex / 时长，且 fallback 要和 `:root` 默认值一致。
- 可作为 lint 守卫方向：禁止 `packages/uikit/src/**/*.vue` 的 `<style>` 出现裸 hex / 裸 `rgba()` / 裸 `Ns|Nms` 时长（fallback 参数除外）。

**软约定**

- 新组件沿用 `<style scoped>` + `uikit-块--修饰` BEM，不新造全局类名。
- 主题联动值（hover 圆角、container gap 等）走 store + `use-theme`，不在组件里各写一份逻辑。

## 现存漂移（改样式时会撞到，别跟着抄；细节见 `TECH-DEBT.md`）

- **D3**：约 140 处 hex + 51 处 `rgba()` 硬编码颜色（重灾区：`multi-select-bar`、`message-bubble-wrapper`、`input`、`conversation-item`）。改到这些文件时顺手换成 token，别照抄硬编码。
- **D4**：组件引用了**未定义**的 `--uikit-*`（如 `--uikit-text-tertiary` / `-bg-tertiary` / `-primary-rgb`），永远只渲染 fallback，且各处 fallback 不一致（`--uikit-primary-rgb` 给的蓝值和真实 primary 色相都对不上）。要用就先把变量补进 `theme/index.css`。
- **D12**：约 50 处硬编码 `transition` 时长（如 `input.vue` 的 `transition: border-color 0.2s`）绕过了动画开关，应改 `var(--uikit-anim-duration)`。

## 反面清单

- ❌ 照 `uno.config.ts` 写 `class="u-center"` / attributify / `rounded-uikit-md`——库没挂 `unocss()`，不生效。
- ❌ 组件里写死 `#fff` / `8px` / `0.2s`（非 fallback 位置），绕过 token 与动画开关。
- ❌ 现编 `--uikit-xxx` 变量名却不加进 `src/theme/index.css`——永远只渲染 fallback，等于没换肤。
- ❌ 只改 `:root` 忘了 `[data-uikit-theme="dark"]`——暗色下颜色 / 对比度必出问题。
- ❌ 直接 `document.documentElement.style.setProperty(...)` 改主题，绕开 `use-theme` / store。
- ❌ 组件里直接 `env(safe-area-inset-top)` 或自己监听 `resize/visualViewport`——H5 适配走 `UIKitProvider :h5`。
- ❌ 用普通 `<style>` 写组件样式泄漏全局（全局 / 穿透样式才用非 scoped 块，且要克制）。
