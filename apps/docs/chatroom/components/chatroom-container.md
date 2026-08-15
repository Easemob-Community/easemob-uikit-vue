# ChatroomContainer 聊天室容器（规划中）

> 组件开发中，本页为**规划占位页**。API 以最终发布为准，发布后由 `gen:api` 自动生成
> API 表格并替换本页占位内容。

## 规划中的接入形态

聊天室与单群聊共用 `EmUIKitProvider` 基座，进房 / 退房由容器驱动：

```vue
<EmUIKitProvider :app-key="appKey" h5>
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</EmUIKitProvider>
```

## 规划中的命名插槽

每个边界都开槽，变种时优先插槽、其次场景预设 config、最后才考虑 fork：

`header` / `toolbar` / `message-item` / `message-custom` / `gift-bar` / `mic-queue` /
`member-item` / `member-panel` / `empty` / `notice` / `input-bar`

## 规划中的场景预设

`live`（直播）/ `voice`（语聊房）/ `class`（小班课）/ `custom`（自定义），场景 = 纯配置 +
插槽覆盖，不 fork 代码；未识别 custom 消息有兜底渲染。

## 相关文档

- [双 UIKit 架构](../guide/architecture)
- 仓库根目录 [CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-UIKIT-DESIGN.md)（§5.4 接入 API 契约草案）
