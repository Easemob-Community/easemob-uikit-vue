# Changelog

## 1.1.0 (2026-07-01)

### 新增

- H5 适配核心能力：新增 `useH5Adaptation()` 与 `UIKitProvider` 的 `h5` 配置，集中管理 viewport、安全区、软键盘高度、下拉刷新开关与字号缩放预留。
- 安全区接入：自动为 `chat-container`、`chat` header、`address-book-container` header/footer、`popup` bottom、`scroll-to-top`、`message-input` emoji sheet、`conversation-list` header/footer 增加安全区内边距。
- 键盘适配：`chat` 输入框 focus 时自动滚动消息列表到底部，避免软键盘遮挡最新消息。
- 下拉刷新：`<UIKitProvider :h5="{ pullRefresh: 'auto' }">` 可在触屏设备上自动开启。
- 长按交互：`useLongPress` 统一改用 vueuse `onLongPress`，增加 touchmove 阈值与长按时禁止 body 滚动，解决 H5 长按与页面滚动冲突。
- 动画 token 接入：`message-input` emoji sheet 等 H5 高频路径的过渡时长改接 `--uikit-anim-*` CSS 变量。

### 文档

- 新增 [H5 适配指南](apps/docs/guide/h5-adaptation.md)。
- 更新根 `README.md`、`apps/docs/index.md` 与 `apps/docs/.vitepress/config.ts`。
- 新增 `.agent/skills/uikit-h5-adaptation/SKILL.md`，并更新 `AGENTS.md`、相关 skill 与 `TECH-DEBT.md`。
