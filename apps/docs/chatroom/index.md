---
layout: home

hero:
  name: 聊天室 UIKit
  text: Vue 3 聊天室 UI 组件库
  tagline: 面向直播间、语聊房、小班课等聊天室场景的独立场景包（@easemob/uikit-chatroom），与单群聊 UIKit 共享基座，当前处于开发阶段，本文档同步建设中。
  image:
    light: /logo-light.png
    dark: /logo-dark.png
    alt: 聊天室 UIKit
  actions:
    - theme: brand
      text: 快速开始（建设中）
      link: /chatroom/guide/quickstart
    - theme: alt
      text: 双 UIKit 架构
      link: /chatroom/guide/architecture

features:
  - icon: 🏠
    title: 房间生命周期
    details: 进房 / 退房 / 断线自动重进，房间状态机与 join 竞态处理，H5 优先。
  - icon: 💬
    title: 广播消息流
    details: 历史消息拉取 + 增量追加，渲染节流与列表封顶，无未读 / 无回执 / 无会话列表语义。
  - icon: 👥
    title: 成员与权限
    details: 成员列表、管理员、禁言 / 踢人 / 全员禁言，owner / admin / member 三级权限模型。
  - icon: 📢
    title: 公告与房间属性
    details: 公告发布订阅，房间自定义 KV 属性四层同步，变种无需自建服务端。
  - icon: 🎨
    title: 场景预设
    details: 直播 / 语聊 / 小班课 / 自定义场景，纯配置 + 插槽覆盖即可变种，不 fork 代码。
  - icon: 📱
    title: H5 优先
    details: 移动端优先设计，安全区、触控优化开箱即用，与单群聊 UIKit 共享主题与 i18n 基座。
---

::: warning 开发中
`@easemob/uikit-chatroom` 尚在开发阶段。本文档当前为**架构骨架**：顶部切换器已支持在
「单群聊 UIKit」与「聊天室 UIKit」两套文档之间切换，组件页与 API 表格将随开发进度逐步补齐。
:::
