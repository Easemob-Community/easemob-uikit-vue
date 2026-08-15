# 快速开始（建设中）

> 聊天室 UIKit 的快速开始文档正在建设中，将在 `@easemob/uikit-chatroom` 首个可用版本
> 发布后补齐。本页仅展示**预期接入形态**（以设计稿为准，API 可能调整）。

## 预期接入形态

聊天室与单群聊共用同一套 Provider 基座（`@easemob/uikit-core`），不引入新的 Provider 概念，
进房 / 退房由容器驱动：

```vue
<EmUIKitProvider :app-key="appKey" h5>
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</EmUIKitProvider>
```

## 开发进度

- [ ] `@easemob/uikit-chatroom` 包落地（进行中）
- [ ] `EmChatroomContainer` 容器与命名插槽
- [ ] 场景预设（live / voice / class / custom）
- [ ] 快速开始 / 组件文档 / API 表格补齐

::: tip 设计文档
接入 API 的完整契约草案见 [双 UIKit 架构](./architecture) 与仓库根目录
[CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-UIKIT-DESIGN.md)。
:::
