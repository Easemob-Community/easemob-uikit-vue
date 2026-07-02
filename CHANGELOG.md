# Changelog

## 1.1.1 (2026-07-02)

### 新增

- 新增 `useOwnUserInfo()` 组合式函数，外层业务可方便地获取当前登录用户自己的昵称/头像：`const { userInfo, displayName, avatarUrl } = useOwnUserInfo()`。
  - 自动拉取当前用户资料并复用 UIKit 内部缓存。
  - 不调用陌生人资料订阅，避免在 demo 等未开通订阅权限的环境下产生额外请求。

### 修复

- 修复用户资料订阅在服务端未开通/无权限时产生大量 403 控制台警告的问题。
  - `UserInfoDomain.subscribeUserInfos` 现在会合并同一事件循环内的订阅请求，减少并发。
  - 检测到 `code === 210` / `httpStatus === 403` / `reason === 'service_forbidden'` 时自动熔断，后续不再发起订阅请求。
  - 失败用户 ID 会被缓存，避免反复重试；权限类错误仅 warn 一次，避免刷屏。
  - 新增 `UIKitFeatures.enableUserInfoSubscription` 开关，业务可主动关闭订阅。
- 修复聊天信息抽屉中备注编辑未接入 SDK 的问题。
  - 点击保存后调用 `contactManager.setContactRemark` 同步到服务端。
  - 备注保存成功后抽屉内名称、联系人列表等使用 `remark` 的位置会自动刷新。
  - 保存过程中按钮禁用并显示“保存中...”。
  - 新增 `chat.info.remarkSaveFailed` / `chat.info.saving` 国际化文案。

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
