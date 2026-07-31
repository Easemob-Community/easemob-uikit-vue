# Easemob UIKit Vue 图标资产清单（交付 UI 设计师）

> **用途**：供 UI 设计师按当前在用的图标进行统一重绘或替换。  
> **来源**：基于 `lucide-static@1.27.0`（ISC License）本地化 vendoring，存放于 `packages/uikit/src/assets/icons/`。  
> **统计**：当前在库图标共 **86 个**，源码中实际引用 **85 个**（`actions/check_2` 与 `actions/check` 疑似重复）。  
> **最后更新**：2026-07-30（分支 `dev`）

---

## 1. 图标系统说明

### 1.1 技术实现

- **组件入口**：`packages/uikit/src/components/icon/icon.vue`
- **注册方式**：Vite `import.meta.glob` 自动扫描 `src/assets/icons/**/*.svg`
- **引用格式**：`name="category/icon-name"`，例如 `name="actions/trash"`
- **默认尺寸**：`20px`（Icon 组件默认），`IconButton`  small `14px` / medium `16px`
- **着色方式**：默认继承 `currentColor`，支持语义色 `primary / success / warning / danger / info`
- **许可说明**：Lucide 图标已复制 `LICENSE.lucide.txt` 到 `src/assets/icons/`，商业使用合规

### 1.2 设计交付格式要求

| 项目 | 要求 |
|------|------|
| 画布尺寸 | 优先 `24×24` viewBox；特殊场景可 `20×20` 或 `16×16` |
| 描边/填充 | 建议统一为 **描边式（stroke）**，便于跟随主题色；状态类图标可用填充强调 |
| 描边粗细 | 默认 `1.5px~2px`，与 Lucide 默认 `2px` 对齐 |
| 拐角 | 圆角端点/连接，保持 Lucide 视觉语言 |
| 色彩 | 提供 `currentColor` 单色版本；状态类（success/warning/danger/info）可单独提供彩色版本 |
| 文件格式 | 单个 `.svg`，无压缩，保留 viewBox |
| 命名 | 按 `分类/图标名.svg` 存放，英文小写，下划线连接多词 |
| 深色模式 | 图标本身只提供单色，深色模式通过 CSS 变量换色，不需单独深色图标 |

---

## 2. 在用图标清单（按业务模块）

### 2.1 通用动作类（actions/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `actions/check` | `check` | 在线状态选中、群信息编辑确认、消息气泡选中 | ✅ 保留 |
| `actions/check_2` | `check-check` | 编辑栏完成 | ⚠️ 与 `chat/doneAll` 重复，建议合并 |
| `actions/check_in_circle_fill` | `circle-check` | 文本消息已发送成功 | ✅ 保留 |
| `actions/checked_ellipse` | `circle-check` | 多选选中态、联系人/群组项选中 | ✅ 保留 |
| `actions/checked_rectangle` | `square-check` | 消息交互区复选 | ✅ 保留 |
| `actions/close` | `x` | Mention 弹窗关闭 | ✅ 保留 |
| `actions/crown` | `crown` | 群成员列表：群主标识 | ✅ 保留 |
| `actions/edit` | `pencil` | 群信息编辑、联系人备注编辑 | ✅ 保留 |
| `actions/ellipsis_vertical` | `ellipsis-vertical` | Chat 右上角更多、群文件项更多、群成员操作 | ✅ 保留 |
| `actions/loading_circle` | `loader-circle` | 合并消息 Modal 加载、消息发送中、会话列表加载 | ✅ 保留（建议增加动效规范） |
| `actions/lock` | `lock` | 群成员：禁言 | ✅ 保留 |
| `actions/plus` | `plus` | Cell 故事、群信息添加成员、群管理「+」 | ✅ 保留 |
| `actions/plus_in_circle` | `circle-plus` | H5 输入扩展按钮、会话列表新建 | ✅ 保留 |
| `actions/shield` | `shield` | 群成员：设为管理员 | ✅ 保留 |
| `actions/shield-off` | `shield-off` | 群成员：取消管理员 | ✅ 保留 |
| `actions/trash` | `trash-2` | 删除聊天记录、删除消息、删除好友、会话删除 | ✅ 保留，危险操作建议配 danger 色 |
| `actions/unchecked_ellipse` | `circle` | 多选未选中态 | ✅ 保留 |
| `actions/unlock` | `unlock` | 群成员：取消禁言 | ✅ 保留 |
| `actions/user-check` | `user-check` | 群成员：取消拉黑 | ✅ 保留 |
| `actions/user-minus` | `user-minus` | 群成员：移除成员 | ✅ 保留 |
| `actions/user-x` | `user-x` | 群成员：拉黑 | ✅ 保留 |
| `actions/xmark_in_circle_fill` | `circle-x` | 编辑栏取消、引用消息取消 | ✅ 保留 |
| `actions/xmark_thick` | `x` | 在线状态清除、群信息取消编辑、群详情取消 | ✅ 保留 |
| `actions/xmark_thin` | `x` | 置顶消息关闭 | ✅ 保留 |
| `actions/ban` | `ban` | 联系人详情：拉黑 | ✅ 保留 |

### 2.2 箭头类（arrows/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `arrows/arrow_down` | `arrow-down` | 消息列表滚动到底部 | ✅ 保留 |
| `arrows/arrow_down_n_box` | `download` | 图片/视频下载 | ✅ 保留 |
| `arrows/arrow_n_line` | `arrow-down-to-line` | 会话项：消息到达/下载 | ⚠️ 语义模糊，建议复核 |
| `arrows/arrow_right` | `arrow-right` | 转发 Modal：进入下一级 | ✅ 保留 |
| `arrows/arrow_turn_left` | `corner-up-left` | 消息交互：回复 | ✅ 保留 |
| `arrows/arrow_turn_right` | `corner-up-right` | 多选栏：转发 | ✅ 保留 |
| `arrows/arrow_up_n_box` | `upload` | 群管理：上传文件/图片 | ✅ 保留 |
| `arrows/arrow_up_thick` | `arrow-up` | 滚动到顶部、置顶消息向上 | ✅ 保留 |
| `arrows/arrow_Uturn_anti_clockwise` | `undo-2` | 消息交互：撤回 | ✅ 保留 |
| `arrows/arrowto` | `reply` | 群管理：返回/返回上级 | ⚠️ 语义近似，建议改为 `arrow-left` 或 `chevron-left` |
| `arrows/line_n_arrow` | `arrow-up-to-line` | 会话项：发送中/已发送 | ⚠️ 语义模糊，建议改为 `arrow-up` 或 `check` |

### 2.3 消息相关（chat/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `chat/3lines_n_arrow` | `forward` | 消息交互：转发、引用转发 | ✅ 保留 |
| `chat/bubble_fill` | `message-circle` | 用户/群卡片：发消息、联系人发消息、空会话 | ✅ 保留 |
| `chat/doneAll` | `check-check` | 消息气泡已读、会话项已读 | ✅ 保留 |
| `chat/modifyMsg` | `square-pen` | 消息交互：编辑消息 | ✅ 保留 |
| `chat/pin` | `pin` | 消息气泡置顶、置顶栏图标 | ✅ 保留 |
| `chat/pinned` | `pin` | 会话项：置顶标识 | ⚠️ 与 `chat/pin` 相同，建议区分「已置顶」与「置顶操作」 |
| `chat/unpin` | `pin-off` | 消息交互：取消置顶 | ✅ 保留 |

### 2.4 消息状态/反馈（status/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `status/info` | `info` | Toast info | ✅ 保留 |
| `status/success` | `circle-check` | Toast success | ✅ 保留 |
| `status/error` | `circle-x` | Toast error、消息发送失败 | ✅ 保留 |
| `status/warning` | `alert-triangle` | Toast warning | ✅ 保留 |

### 2.5 音视频类（audio-video/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `audio-video/camera` | `camera` | H5 输入：拍照 | ✅ 保留 |
| `audio-video/mic` | `mic` | 输入：语音、H5 语音面板 | ✅ 保留 |
| `audio-video/mic_on` | `mic` | H5 语音输入（与 `mic` 同名） | ⚠️ 重复，建议区分「录音中/按住录音」状态 |
| `audio-video/phone_pick` | `phone` | 用户卡片：语音通话 | ✅ 保留 |
| `audio-video/play` | `play` | 视频/语音播放 | ✅ 保留 |
| `audio-video/speaker_wave_2` | `volume-2` | 文件消息：音频预览 | ✅ 保留 |
| `audio-video/speaker_xmark` | `volume-x` | Story 占位 | ⚠️ 未在业务组件使用，建议删除或用于静音状态 |
| `audio-video/video_camera` | `video` | 用户卡片：视频通话、输入：视频、文件消息 | ✅ 保留 |

### 2.6 文件与媒体（files-media/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `files-media/archives` | `archive` | 文件消息：压缩包 | ✅ 保留 |
| `files-media/doc` | `file-text` | 文件消息：文档 | ✅ 保留 |
| `files-media/doc_on_doc` | `copy` | 消息交互：复制 | ✅ 保留 |
| `files-media/file` | `file` | 输入：文件、文件消息默认、群文件 | ✅ 保留 |
| `files-media/folder` | `folder` | H5 输入：文件、合并消息文件夹 | ✅ 保留 |
| `files-media/img` | `image` | 输入：图片、文件消息：图片 | ✅ 保留 |

### 2.7 用户与人（people/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `people/person_single` | `user` | Story：单用户 | ⚠️ 建议正式用于联系人详情、个人中心 |
| `people/person_add` | `user-plus` | 会话列表：添加联系人 | ✅ 保留 |
| `people/person_double_fill` | `users` | 会话列表：创建群组 | ✅ 保留 |
| `people/person_3lines_fill` | `contact` | 通讯录入口 | ✅ 保留 |
| `people/member_group` | `users` | Story：群成员 | ⚠️ 与 `person_double_fill` 重复，建议合并 |

### 2.8 杂项（misc/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `misc/bell` | `bell` | 会话项：提醒 | ✅ 保留 |
| `misc/bell_slash` | `bell-off` | 会话项：免打扰 | ✅ 保留（需确认当前版本文件已存在） |
| `misc/gear` | `settings` | Story 设置 | ⚠️ 未在业务组件使用，建议用于全局设置入口 |
| `misc/globe_asia-australia` | `globe` | 消息交互：翻译 | ✅ 保留 |
| `misc/lock` | `lock` | Story 锁定 | ⚠️ 建议用于隐私/加密会话标识 |
| `misc/magnifier2` | `search` | 输入搜索、通讯录搜索、转发搜索、 Mention 搜索 | ✅ 保留 |

### 2.9 导航（navigation/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `navigation/chevron_left` | `chevron-left` | 通讯录返回 | ✅ 保留 |
| `navigation/chevron_right` | `chevron-right` | Cell 右侧箭头、联系人导航 | ✅ 保留 |

### 2.10 表情（emojis-reactions/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `emojis-reactions/face` | `smile` | 输入：表情 | ✅ 保留 |

### 2.11 空状态（empty/）

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `empty/contact` | `users` | 暂无联系人 | ✅ 保留 |
| `empty/group` | `users` | 暂无群组 | ⚠️ 建议与 `empty/contact` 区分 |
| `empty/members` | `users` | 暂无成员 | ⚠️ 建议与上面区分 |
| `empty/conversation` | `message-circle` | 暂无会话 | ✅ 保留 |
| `empty/chat` | `message-square` | 请选择会话 / 合并消息空 | ✅ 保留 |
| `empty/search` | `search-x` | 搜索无结果 | ✅ 保留 |
| `empty/blocklist` | `shield-off` | 暂无黑名单成员 | ✅ 保留 |
| `empty/mutelist` | `volume-x` | 暂无禁言成员 | ✅ 保留 |
| `empty/files` | `folder-open` | 暂无群文件 | ✅ 保留 |
| `empty/mentions` | `at-sign` | @ 提及无结果 | ✅ 保留 |
| `empty/read-receipt` | `check-check` | 已读回执空 | ✅ 保留 |

---

## 3. 当前已知问题与优先修复项

以下问题来自最新一轮走查，建议设计师优先处理：

### 3.1 图标「糊了」问题

- **根因**：部分图标在渲染时被强制缩放到非 24 整数倍尺寸，或 SVG 本身 viewBox/路径未对齐像素网格。
- **建议**：
  - 所有图标重绘时对齐 `24×24` 网格，路径端点落在整数坐标或半像素上。
  - 避免在 `16px` 以下展示复杂双勾、盾牌、皇冠等细节图标；必要时提供 `16px` 简化版。
  - 交付时标注「最小可用尺寸」。

### 3.2 主题色跟随不一致

- **现象**：部分图标不跟随主题色，默认黑色；深色模式下行为不一致。
- **建议**：
  - 统一使用单色描边，颜色由 CSS 变量控制。
  - 语义状态（danger/success/warning）使用独立色值，不依赖主题色。

### 3.3 重复/可合并图标

| 重复组 | 建议 |
|--------|------|
| `actions/check` / `actions/check_2` / `chat/doneAll` | 保留一个「对勾」基础形，双勾用于已读/编辑完成 |
| `chat/pin` / `chat/pinned` | 区分为「置顶操作」与「已置顶状态」 |
| `audio-video/mic` / `audio-video/mic_on` | 区分为「语音入口」与「录音中」 |
| `people/person_double_fill` / `people/member_group` / `empty/contact/group/members` | 统一群组/多人语义 |

### 3.4 语义不清的图标

- `arrows/arrow_n_line`、`arrows/line_n_arrow`：会话项消息状态语义弱，建议改为清晰的「已发送 / 已送达 / 已读」状态组。
- `arrows/arrowto`：用于返回上级，建议改为 `chevron-left`。

---

## 4. 增量图标建议（按模块）

> 以下图标当前缺失或需要更贴切的表达，建议设计师一并补充。

### 4.1 H5 输入区域（高优先级）

当前 H5 输入使用原生扩展按钮，建议补齐：

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `input/keyboard` | `keyboard` | 切换回键盘输入 |
| `input/emoji` | `smile-plus` | 展开表情面板 |
| `input/keyboard_hide` | `keyboard-off` | 收起键盘 |
| `input/more` | `plus-circle` 或 `circle-plus` | 展开更多功能（与现有 `plus_in_circle` 区分） |
| `input/send` | `send` | 发送按钮 |
| `input/voice_wave` | `audio-waveform` / `mic` | 录音中波形 |
| `input/attachment` | `paperclip` | 附件通用入口 |

### 4.2 消息气泡状态（高优先级）

当前发送中 icon 为静态 `loader-circle`，建议：

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `message/status_sending` | `loader-circle`（带动效规范） | 发送中 |
| `message/status_failed` | `circle-alert` 或 `circle-x` | 发送失败 |
| `message/status_sent` | `check` | 已发送 |
| `message/status_delivered` | `check-check` | 已送达 |
| `message/status_read` | `check-check`（彩色） | 已读 |
| `message/status_retry` | `refresh-cw` | 重发 |

### 4.3 群管理（中优先级）

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `group/admin_badge` | `shield-check` | 管理员标识 |
| `group/owner_badge` | `crown`（已有） | 群主标识 |
| `group/mute_all` | `volume-x` | 全员禁言 |
| `group/mute_expire` | `clock` | 禁言到期时间 |
| `group/join_request` | `user-plus` | 入群申请 |
| `group/allowlist` | `shield-check` | 白名单 |
| `group/shared_files` | `folder-open` | 群文件入口 |
| `group/announcement` | `megaphone` | 群公告 |

### 4.4 联系人 / 关系链（中优先级）

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `contact/add_friend` | `user-plus` | 添加好友 |
| `contact/remove_friend` | `user-minus` | 删除好友 |
| `contact/block` | `ban`（已有） | 拉黑 |
| `contact/unblock` | `circle-check` | 取消拉黑 |
| `contact/remark` | `pencil`（已有） | 修改备注 |
| `contact/request_pending` | `clock` | 待验证 |

### 4.5 会话列表（中优先级）

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `conversation/pin` | `pin`（已有） | 置顶标识 |
| `conversation/mute` | `bell-off` / `bell-slash`（已有） | 免打扰 |
| `conversation/draft` | `pencil-line` | 草稿标记 |
| `conversation/mention` | `at-sign` | @ 提及标记 |
| `conversation/typing` | `pencil` / `more-horizontal` | 对方正在输入 |

### 4.6 空状态插画（低优先级）

当前空状态使用单色图标，建议提供：

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `empty/no_network` | `wifi-off` | 无网络 |
| `empty/no_results` | `search-x`（已有） | 搜索无结果 |
| `empty/error` | `alert-circle` | 加载失败 |
| `empty/notifications` | `bell-off` | 无通知 |

### 4.7 在线状态（Presence）

当前在线状态使用勾选，建议提供小圆点/小图标：

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `presence/online` | `circle`（填充绿色） | 在线 |
| `presence/busy` | `minus-circle`（红色） | 忙碌 |
| `presence/away` | `clock`（黄色） | 离开 |
| `presence/offline` | `circle`（灰色描边） | 离线 |
| `presence/custom` | `pencil` | 自定义状态 |

### 4.8 Toast / 反馈

当前所有 Toast 默认 info 为感叹号，建议：

| 建议名称 | 参考 Lucide | 用途 |
|----------|-------------|------|
| `toast/success` | `circle-check`（已有） | 成功 |
| `toast/error` | `circle-x`（已有） | 错误 |
| `toast/warning` | `alert-triangle`（已有） | 警告 |
| `toast/info` | `info`（已有） | 信息 |
| `toast/copy` | `copy-check` | 复制成功 |
| `toast/download` | `download` | 下载完成 |

---

## 5. 具体文件映射（供开发直接替换）

以下表格按 `src/assets/icons/` 下的实际路径列出，开发同学可直接按同名文件替换。

```
src/assets/icons/
├── actions/
│   ├── ban.svg              ← lucide: ban
│   ├── check.svg            ← lucide: check
│   ├── check_2.svg          ← lucide: check-check
│   ├── check_in_circle_fill.svg ← lucide: circle-check
│   ├── checked_ellipse.svg  ← lucide: circle-check
│   ├── checked_rectangle.svg ← lucide: square-check
│   ├── close.svg            ← lucide: x
│   ├── crown.svg            ← lucide: crown
│   ├── edit.svg             ← lucide: pencil
│   ├── ellipsis_vertical.svg ← lucide: ellipsis-vertical
│   ├── loading_circle.svg   ← lucide: loader-circle
│   ├── lock.svg             ← lucide: lock
│   ├── plus.svg             ← lucide: plus
│   ├── plus_in_circle.svg   ← lucide: circle-plus
│   ├── shield-off.svg       ← lucide: shield-off
│   ├── shield.svg           ← lucide: shield
│   ├── trash.svg            ← lucide: trash-2
│   ├── unchecked_ellipse.svg ← lucide: circle
│   ├── unlock.svg           ← lucide: unlock
│   ├── user-check.svg       ← lucide: user-check
│   ├── user-minus.svg       ← lucide: user-minus
│   ├── user-x.svg           ← lucide: user-x
│   ├── xmark_in_circle_fill.svg ← lucide: circle-x
│   ├── xmark_thick.svg      ← lucide: x
│   └── xmark_thin.svg       ← lucide: x
├── arrows/
│   ├── arrow_down.svg       ← lucide: arrow-down
│   ├── arrow_down_n_box.svg ← lucide: download
│   ├── arrow_n_line.svg     ← lucide: arrow-down-to-line
│   ├── arrow_right.svg      ← lucide: arrow-right
│   ├── arrow_turn_left.svg  ← lucide: corner-up-left
│   ├── arrow_turn_right.svg ← lucide: corner-up-right
│   ├── arrow_up_n_box.svg   ← lucide: upload
│   ├── arrow_up_thick.svg   ← lucide: arrow-up
│   ├── arrow_Uturn_anti_clockwise.svg ← lucide: undo-2
│   ├── arrowto.svg          ← lucide: reply
│   └── line_n_arrow.svg     ← lucide: arrow-up-to-line
├── audio-video/
│   ├── camera.svg           ← lucide: camera
│   ├── mic.svg              ← lucide: mic
│   ├── mic_on.svg           ← lucide: mic
│   ├── phone_pick.svg       ← lucide: phone
│   ├── play.svg             ← lucide: play
│   ├── speaker_wave_2.svg   ← lucide: volume-2
│   ├── speaker_xmark.svg    ← lucide: volume-x
│   └── video_camera.svg     ← lucide: video
├── chat/
│   ├── 3lines_n_arrow.svg   ← lucide: forward
│   ├── bubble_fill.svg      ← lucide: message-circle
│   ├── doneAll.svg          ← lucide: check-check
│   ├── modifyMsg.svg        ← lucide: square-pen
│   ├── pin.svg              ← lucide: pin
│   ├── pinned.svg           ← lucide: pin
│   └── unpin.svg            ← lucide: pin-off
├── emojis-reactions/
│   └── face.svg             ← lucide: smile
├── empty/
│   ├── blocklist.svg        ← lucide: shield-off
│   ├── chat.svg             ← lucide: message-square
│   ├── contact.svg          ← lucide: users
│   ├── conversation.svg     ← lucide: message-circle
│   ├── files.svg            ← lucide: folder-open
│   ├── group.svg            ← lucide: users
│   ├── members.svg          ← lucide: users
│   ├── mentions.svg         ← lucide: at-sign
│   ├── mutelist.svg         ← lucide: volume-x
│   ├── read-receipt.svg     ← lucide: check-check
│   └── search.svg           ← lucide: search-x
├── files-media/
│   ├── archives.svg         ← lucide: archive
│   ├── doc.svg              ← lucide: file-text
│   ├── doc_on_doc.svg       ← lucide: copy
│   ├── file.svg             ← lucide: file
│   ├── folder.svg           ← lucide: folder
│   └── img.svg              ← lucide: image
├── misc/
│   ├── bell.svg             ← lucide: bell
│   ├── bell_slash.svg       ← lucide: bell-off
│   ├── gear.svg             ← lucide: settings
│   ├── globe_asia-australia.svg ← lucide: globe
│   ├── lock.svg             ← lucide: lock
│   └── magnifier2.svg       ← lucide: search
├── navigation/
│   ├── chevron_left.svg     ← lucide: chevron-left
│   └── chevron_right.svg    ← lucide: chevron-right
├── people/
│   ├── member_group.svg     ← lucide: users
│   ├── person_3lines_fill.svg ← lucide: contact
│   ├── person_add.svg       ← lucide: user-plus
│   ├── person_double_fill.svg ← lucide: users
│   └── person_single.svg    ← lucide: user
└── status/
    ├── error.svg            ← lucide: circle-x
    ├── info.svg             ← lucide: info
    ├── success.svg          ← lucide: circle-check
    └── warning.svg          ← lucide: alert-triangle
```

---

## 6. 设计师交付 Checklist

- [ ] 提供所有在用 86 个图标的重绘版本（按上表路径命名）
- [ ] 提供「增量建议」中标记为高优先级的图标
- [ ] 所有图标统一 `24×24` viewBox，单色描边，支持 `currentColor`
- [ ] 状态类图标（success/warning/danger/info）提供推荐色值
- [ ] 为复杂图标提供 `16px` 简化版本（如皇冠、盾牌、双勾）
- [ ] 提供一份「最小可用尺寸」标注
- [ ] 确认深色模式下图标颜色由代码变量控制，无需单独出图
- [ ] 如有品牌色/主题色变化，提供色板映射表

---

## 7. 开发侧替换流程

设计师交付后，开发同学按以下步骤替换：

1. 将新 SVG 按 `src/assets/icons/分类/图标名.svg` 覆盖原文件。
2. 运行 `cd packages/uikit && pnpm run icons:check`，确认无缺失引用。
3. 运行 `pnpm -F @easemob/uikit build`，确认构建通过。
4. 在 demo 中检查关键页面：会话列表、聊天页、群详情、联系人详情、转发 Modal。
5. 如需新增图标，同步更新 `scripts/vendor-lucide-icons.mjs` 中的 `ADD_ICONS` 映射（非 Lucide 源可跳过）。

---

## 附录：Lucide 许可声明

本项目使用的图标基于 [Lucide](https://lucide.dev/)，许可证为 ISC。完整许可文本见：

```
packages/uikit/src/assets/icons/LICENSE.lucide.txt
```

如设计师提供自绘图标替换 Lucide 图标，建议在产品文档或 README 中保留类似声明，直至全部替换为非 Lucide 图标。
