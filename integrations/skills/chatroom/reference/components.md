# 组件与插槽清单

聊天室组件**具名导出、不注册全局**，按需 `import`（`@easemob/uikit-chatroom`）。

## 容器

| 组件 | 说明 |
| --- | --- |
| `EmChatroomContainer` | 页面容器：进出房 / 历史 / 消息收发 / 成员面板 / 系统通知，19 个命名插槽 + 场景预设（见下） |

## 场景预设与 scene 配置

`scene` 支持内置名与部分配置对象：

```ts
interface ChatroomSceneConfig {
  name: 'live' | 'voice' | 'class' | (string & {})
  layout: 'fullscreen' | 'split' | 'auto'        // split = PC 三栏
  features: {
    gift?: boolean               // 礼物栏 / 礼物消息渲染
    micQueue?: boolean           // 麦位管理（语聊房）
    memberList?: 'panel' | 'popup' | 'none'
    announcement?: boolean       // 公告展示
    header?: boolean             // 内置顶部栏（缺省 true；false 隐藏，配 #header 插槽可容器内接管）
    messageFilter?: (msg) => boolean
    messageArea?: { height?, transparent? }  // 直播消息区限高 + 透明
    management?: { mute?, kick?, muteAll?, announcement?, blocklist?, admin? }
    multilineInput?: boolean     // PC 输入条多行
    keyboard?: boolean           // Esc 关闭弹层
  }
  panels?: { stageWidth?, memberWidth? }
  popupMode?: 'auto' | 'sheet' | 'dialog'
  themeOverrides?: Record<string, string>   // CSS 变量覆盖
  i18nOverrides?: Record<string, string>    // 文案覆盖
}
```

## 容器命名插槽（19 个）

| 插槽 | scope | 默认内容 | 覆盖粒度 |
| --- | --- | --- | --- |
| `header` | `{ status, room-info, on-exit }` | `ChatroomHeader` | 整条（完全重写） |
| `header-title` | `{ room-info }` | 房间名 | 标题区 |
| `header-extra` | `{ room-info }` | 无 | 右侧扩展区 |
| `toolbar` | `{ status }` | 无 | header 与消息区之间的业务工具条 |
| `manage-actions` | `{ can-manage, is-owner, current-role }` | 无 | 管理位操作条（仅 owner/admin 可见） |
| `stage` | `{ status, room-info }` | 无 | split 舞台区（视频/白板/商品区） |
| `mic-queue` | — | `ChatroomMicQueue` | 麦位栏 |
| `notice` | `{ content }` | `ChatroomNoticeBanner` | 公告条 |
| `message-item` | `{ message }` | `ChatroomMessageItem` | 单条消息渲染 |
| `message-custom` | `{ message }` | 兜底渲染 | custom 消息优先渲染 |
| `message-list` | `{ messages, status, history-has-more, loading-history, load-more }` | 加载更多 + VirtualList + 空态 | **消息列表整块替换**（滚动/加载职责转移业务） |
| `empty` | `{ status }` | 「未进房/暂无消息」 | 消息区空态 |
| `gift-bar` | `{ disabled }` | `ChatroomGiftBar` | 礼物栏 |
| `input-bar` | `{ disabled }` | `ChatroomInputBar` | 输入条 |
| `member-panel` | `{ show, on-close }` | `ChatroomMemberPanel` | 成员面板整层 |
| `member-item` | 透传 | `ChatroomMemberItem` | 成员列表项 |
| `member-sidebar` | — | `ChatroomMemberSidebar` | PC 常驻成员侧栏 |
| `terminal` | `{ status, kicked, destroyed, on-exit }` | 被踢/解散提示 | 终态视图 |
| `announcement-editor` | `{ show, content, save, close }` | 内置编辑弹窗 | 公告编辑弹窗 |

## 直播组件集（纯 UI 壳子，可脱离容器）

| 组件 | 说明 |
| --- | --- |
| `ChatroomLiveDanmakuStream` | 弹幕 / 通知双区流（详见 [danmaku.md](./danmaku.md)） |
| `ChatroomLiveTopBar` | 直播顶部信息栏（头像 + 标题 + 热度 + 更多/投诉 + `#extra` 插槽） |
| `ChatroomLiveInputBar` | 直播间输入条（快捷短语 / 节流 / 敏感词 / 动作插槽） |
| `ChatroomGiftBar` | 礼物入口（按钮 → 底部礼物面板） |
| `ChatroomLiveWelcomeBanner` | 欢迎横幅（滑入 3s 自动收起） |
| `ChatroomLiveInteractiveCard` | 商品卡 / 优惠券 / 红包通用卡片壳子 |
| `ChatroomLiveOverlayManager` | 浮动卡片锚定管理器（top / bottom-right） |
| `ChatroomLiveFullscreenEffect` | 全屏动效容器（大礼物 / PK / 公告） |
| `ChatroomMicQueue` | 语聊房麦位栏（属性 KV 四层同步） |

## PC 模式组件

| 组件 | 说明 |
| --- | --- |
| `ChatroomSplitLayout` | 三栏分栏布局壳（成员栏拖拽 200~480px） |
| `ChatroomMemberSidebar` | 常驻成员侧栏（分页 / 黑名单 / 悬停快捷 / 右键菜单） |
| `ChatroomContextMenu` | 通用右键菜单（翻转 / Esc / 外部点击关闭） |

详见 [pc-mode.md](./pc-mode.md)。

## 组合式函数 / 无头接入

| 导出 | 说明 |
| --- | --- |
| `useChatroom` | 房间生命周期（join / leave / 状态 / 重连重进） |
| `useChatroomMessage` | 消息订阅（增量有序 + flush 批量消费）与发送 |
| `useChatroomMember` | 成员分页 / 禁言 / 踢人 / `canManageMember` |
| `useChatroomAttributes` | 房间属性 KV（四层同步） |
| `useChatroomMessageUserInfo` | 消息 ext 昵称头像渲染配置 |
| `useChatroomScene` | 场景预设注册与解析 |

无头接入（不渲染容器、自绘 UI）时：`useChatroom` + `useChatroomMessage` 驱动，
消息订阅为**增量有序 + flush 批量消费**契约（无消费者时不丢消息）。

## API 明细

各组件 props / emits / slots 完整表格见 [api/](./api/)（由文档站 gen:api 同步，勿手改）。
