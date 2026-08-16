# 样式定制

聊天室 UIKit 复用 `@easemob/uikit-core` 的**主题体系**（CSS 变量 + 暗色模式），
并在弹幕流等组件上额外开放了**组件级 CSS 变量 token**。定制方式分四层，
按优先级从低到高：

| 层级 | 方式 | 生效范围 | 适用 |
| --- | --- | --- | --- |
| 1 | 全局 CSS 变量覆盖（`:root` / `html`） | 全站 | 品牌色 / 圆角 / 字号基线 |
| 2 | `scene.themeOverrides` | 容器根元素 | 单房间主题（直播间氛围色） |
| 3 | 祖先元素局部覆盖 | 局部子树 | 单块区域差异化 |
| 4 | **插槽接管**（样式无法覆盖的边界） | 组件内部 | 整块重绘（弹幕条目 / 礼物面板 / 输入条） |

## 一、全局变量覆盖（core 主题体系）

聊天室所有组件使用 core 的统一语义变量（暗色模式自动切换），覆盖它们即可全局换肤：

```css
:root {
  --uikit-primary-color: #ff4d4f;      /* 主色（按钮 / 链接 / 强调） */
  --uikit-bg-base: #f7f8fa;            /* 页面背景 */
  --uikit-bg-secondary: #ffffff;       /* 卡片 / 面板背景 */
  --uikit-text-primary: #1a1a1a;       /* 主文本 */
  --uikit-text-secondary: #666666;     /* 次要文本 */
  --uikit-text-tertiary: #999999;      /* 弱化文本 */
  --uikit-danger-color: #ff4d4f;       /* 危险操作（踢人 / 移除 / 封禁） */
}
```

> core 完整变量清单与暗色模式说明见单群聊文档
> [主题定制](../../guide/theme)（两套 UIKit 共享同一变量体系）。

## 二、scene.themeOverrides（单房间主题）

容器 `scene.themeOverrides` 把变量覆盖**应用到容器根元素**，只影响当前房间：

```vue
<EmChatroomContainer
  room-id="room123"
  :scene="{
    name: 'live',
    themeOverrides: {
      '--uikit-primary-color': '#7c3aed',   // 该直播间紫色主题
      '--live-danmaku-welcome-bg': 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    },
  }"
/>
```

headless 场景由业务自行把 `resolveChatroomScene(scene).themeOverrides` 应用到自己的根元素。

## 三、弹幕流 token（--live-danmaku-*）

`ChatroomLiveDanmakuStream` 的视觉全部经 `--live-danmaku-*` 变量开放，
在**任意祖先元素**覆盖即可（inline style 或 CSS）：

| Token | 默认 | 说明 |
| --- | --- | --- |
| `--live-danmaku-bg` | 半透明白 | 气泡底色 |
| `--live-danmaku-text-color` | — | 气泡正文色 |
| `--live-danmaku-font-size` | `14px` | 正文字号（`size` prop 缺省时生效） |
| `--live-danmaku-line-height` | — | 行高 |
| `--live-danmaku-padding` | — | 气泡内边距 |
| `--live-danmaku-radius` / `-pill` / `-square` | — | 三种圆角预设 |
| `--live-danmaku-name-color` | — | 用户名色（普通消息） |
| `--live-danmaku-normal-name-color` | — | 普通弹幕用户名色 |
| `--live-danmaku-checkin-bg` | — | 签到通知底色 |
| `--live-danmaku-purchase-bg` | — | 购买通知底色 |
| `--live-danmaku-welcome-bg` / `-shadow` | — | 欢迎通知底色 / 阴影 |
| `--live-danmaku-welcome-vip-color` / `-shadow` | — | VIP 欢迎高亮色 / 阴影 |
| `--live-danmaku-gift-bg` / `-border-color` | — | 礼物气泡底色 / 边框 |
| `--live-danmaku-icon-size` | — | 图标尺寸（礼物 / 购物车等） |
| `--live-danmaku-count-size` | — | 合并计数（「等N人」）字号 |
| `--live-danmaku-empty-bg` / `-color` | — | 空态底色 / 文字色 |
| `--live-danmaku-max-width` | — | 气泡最大宽度 |
| `--live-danmaku-max-lines` | `2` | 单条最大行数（超出截断省略） |
| `--live-danmaku-blur` | — | 气泡背景模糊 |

示例（让弹幕胶囊更圆、金色欢迎条）：

```css
.my-live-stage {
  --live-danmaku-radius-pill: 20px;
  --live-danmaku-welcome-bg: linear-gradient(135deg, #fbbf24, #f59e0b);
  --live-danmaku-welcome-vip-color: #fff8e1;
}
```

## 四、其他组件的可定制点

| 组件 | 可定制内容 | 方式 |
| --- | --- | --- |
| 容器（header / 输入条 / 成员面板 / 公告条） | 色板 / 圆角 / 间距 | core 全局变量 |
| `ChatroomLiveTopBar` | 横幅渐变 / 文字 | `#extra` 插槽接管右侧；整体换肤走全局变量；整条重绘用容器 `#header` 插槽 |
| `ChatroomLiveInputBar` | 快捷短语 / 动作区 / 底部面板 | `#quick-phrases` / `#actions` / `#panels` 插槽 |
| `ChatroomLiveInteractiveCard` | 标题 / 主体 / 底部行动区 | `#title` / 默认 / `#footer` 插槽 |
| `ChatroomGiftBar` | 礼物面板整体 | 容器 `#gift-bar` 插槽接管 |
| `ChatroomLiveDanmakuStream` | 单条弹幕 / 徽章 / 前缀 | `#item` / `#badge` / `#prefix` 插槽 + `--live-danmaku-*` token |
| `ChatroomMemberSidebar` / `ChatroomMemberPanel` | 成员项 | `#member-item` 插槽 |

## 五、样式接管 vs 插槽接管（边界）

- **颜色 / 圆角 / 字号 / 间距** → CSS 变量覆盖（推荐，暗色自动适配）；
- **布局结构 / 内容形态**（弹幕内容、礼物面板、输入条动作）→ **插槽接管**，
  插槽优先于 config，能覆盖的边界全部开槽，无需 fork 组件；
- 两者都用不上时再考虑 fork（容器内 `#message-list` 等整块插槽已覆盖大部分场景）。

## 相关文档

- [双 UIKit 架构](./architecture)（core 共享主题体系）
- [ChatroomContainer](../components/chatroom-container)（`themeOverrides` / `i18nOverrides`）
- [直播弹幕流](../components/live-danmaku)（`--live-danmaku-*` token 全清单）
