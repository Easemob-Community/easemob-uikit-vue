# Easemob UIKit Vue 图标资产清单（交付 UI 设计师）

> **用途**：供 UI 设计师按当前在用的图标进行统一重绘或替换。  
> **来源说明**：图标资产位于 `packages/uikit-im/src/assets/icons/`。其中部分仍直接沿用 [Lucide](https://lucide.dev/)（ISC License），部分已替换为设计师新版线性图标，另有部分为设计师原创/业务新增图标。  
> **最后更新**：2026-08-06（分支 `dev`）

---

## 1. 统计摘要

当前在库图标共 **147 个** SVG：

| 类别 | 数量 | 说明 |
|------|------|------|
| 仍是 Lucide 源 | **14** | 与 `lucide-static@1.27.0` 对应图标内容完全一致，建议优先重绘 |
| 已替换为设计师图标 | **69** | 内部命名保留了原 Lucide 映射关系，但 SVG 内容已被设计师版本覆盖 |
| 非 Lucide / 设计师原创 / 业务新增 | **64** | 无 Lucide 对应，属于项目自定义图标 |
| **合计** | **147** | — |

---

## 2. 图标系统说明

### 2.1 技术实现

- **组件入口**：`packages/uikit-im/src/components/icon/icon.vue`
- **注册方式**：Vite `import.meta.glob` 自动扫描 `src/assets/icons/**/*.svg`
- **引用格式**：`name="category/icon-name"`，例如 `name="actions/trash"`
- **默认尺寸**：`20px`（Icon 组件默认），`IconButton` small `14px` / medium `16px`
- **着色方式**：默认继承 `currentColor`，支持语义色 `primary / success / warning / danger / info`
- **许可说明**：仍在沿用的 Lucide 图标已复制 `LICENSE.lucide.txt` 到 `src/assets/icons/`，商业使用合规

### 2.2 设计交付格式要求

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

## 3. 仍是 Lucide 源的图标（建议优先重绘）

以下 **14 个**图标当前仍与 Lucide 源文件完全一致，建议设计师优先提供自绘版本，以便逐步摆脱对 Lucide 的依赖。

| 内部名称 | Lucide 源 | 当前用途 | 建议 |
|----------|-----------|----------|------|
| `audio-video/mic_on` | `mic` | H5 语音输入 | 区分「录音中/按住录音」状态 |
| `empty/blocklist` | `shield-off` | 暂无黑名单成员 | ✅ 提供自绘空状态插画 |
| `empty/chat` | `message-square` | 请选择会话 / 合并消息空 | ✅ 提供自绘空状态插画 |
| `empty/contact` | `users` | 暂无联系人 | ✅ 提供自绘空状态插画 |
| `empty/conversation` | `message-circle` | 暂无会话 | ✅ 提供自绘空状态插画 |
| `empty/files` | `folder-open` | 暂无群文件 | ✅ 提供自绘空状态插画 |
| `empty/group` | `users` | 暂无群组 | ✅ 提供自绘空状态插画，建议与 `empty/contact` 区分 |
| `empty/members` | `users` | 暂无成员 | ✅ 提供自绘空状态插画，建议与 `empty/group` 区分 |
| `empty/mutelist` | `volume-x` | 暂无禁言成员 | ✅ 提供自绘空状态插画 |
| `empty/read-receipt` | `check-check` | 已读回执空 | ✅ 提供自绘空状态插画 |
| `empty/search` | `search-x` | 搜索无结果 | ✅ 提供自绘空状态插画 |
| `misc/map_pin` | `map-pin` | 位置消息图标 | ✅ 保留语义，提供自绘版本 |
| `people/member_group` | `users` | Story：群成员 | ⚠️ 与 `people/person_double_fill` 语义重复，建议合并 |
| `status/info` | `info` | Toast info | ✅ 保留语义，提供自绘版本 |

---

## 4. 已替换为设计师版本的图标（原 Lucide 映射，共 69 个）

这些图标内部命名仍沿用原 Lucide 映射关系，但 `src/assets/icons/` 下的 SVG 内容已被设计师版本覆盖。设计师可继续按当前文件路径迭代优化，无需重新命名。

### 4.1 通用动作类（actions/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `actions/check` | `check` | 在线状态选中、群信息编辑确认、消息气泡选中 |
| `actions/check_2` | `check-check` | 编辑栏完成 |
| `actions/check_in_circle_fill` | `circle-check` | 文本消息已发送成功 |
| `actions/checked_ellipse` | `circle-check` | 多选选中态、联系人/群组项选中 |
| `actions/checked_rectangle` | `square-check` | 消息交互区复选 |
| `actions/close` | `x` | Mention 弹窗关闭 |
| `actions/crown` | `crown` | 群成员列表：群主标识 |
| `actions/edit` | `pencil` | 群信息编辑、联系人备注编辑 |
| `actions/ellipsis_vertical` | `ellipsis-vertical` | Chat 右上角更多、群文件项更多、群成员操作 |
| `actions/loading_circle` | `loader-circle` | 合并消息 Modal 加载、消息发送中、会话列表加载 |
| `actions/lock` | `lock` | 群成员：禁言 |
| `actions/plus` | `plus` | Cell 故事、群信息添加成员、群管理「+」 |
| `actions/plus_in_circle` | `circle-plus` | H5 输入扩展按钮、会话列表新建 |
| `actions/shield` | `shield` | 群成员：设为管理员 |
| `actions/shield-off` | `shield-off` | 群成员：取消管理员 |
| `actions/trash` | `trash-2` | 删除聊天记录、删除消息、删除好友、会话删除 |
| `actions/unchecked_ellipse` | `circle` | 多选未选中态 |
| `actions/unlock` | `unlock` | 群成员：取消禁言 |
| `actions/user-check` | `user-check` | 群成员：取消拉黑 |
| `actions/user-minus` | `user-minus` | 群成员：移除成员 |
| `actions/user-x` | `user-x` | 群成员：拉黑 |
| `actions/xmark_in_circle_fill` | `circle-x` | 编辑栏取消、引用消息取消 |
| `actions/xmark_thick` | `x` | 在线状态清除、群信息取消编辑、群详情取消 |
| `actions/xmark_thin` | `x` | 置顶消息关闭 |

### 4.2 箭头类（arrows/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `arrows/arrow_Uturn_anti_clockwise` | `undo-2` | 消息交互：撤回 |
| `arrows/arrow_down_n_box` | `download` | 图片/视频下载 |
| `arrows/arrow_n_line` | `arrow-down-to-line` | 会话项：消息到达/下载 |
| `arrows/arrow_right` | `arrow-right` | 转发 Modal：进入下一级 |
| `arrows/arrow_turn_left` | `corner-up-left` | 消息交互：回复 |
| `arrows/arrow_turn_right` | `corner-up-right` | 多选栏：转发 |
| `arrows/arrow_up_n_box` | `upload` | 群管理：上传文件/图片 |
| `arrows/arrow_up_thick` | `arrow-up` | 滚动到顶部、置顶消息向上 |
| `arrows/arrowto` | `reply` | 群管理：返回/返回上级 |
| `arrows/line_n_arrow` | `arrow-up-to-line` | 会话项：发送中/已发送 |

### 4.3 消息相关（chat/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `chat/3lines_n_arrow` | `forward` | 消息交互：转发、引用转发 |
| `chat/bubble_fill` | `message-circle` | 用户/群卡片：发消息、联系人发消息、空会话 |
| `chat/doneAll` | `check-check` | 消息气泡已读、会话项已读 |
| `chat/modifyMsg` | `square-pen` | 消息交互：编辑消息 |
| `chat/pin` | `pin` | 消息气泡置顶、置顶栏图标 |
| `chat/pinned` | `pin` | 会话项：置顶标识 |
| `chat/unpin` | `pin-off` | 消息交互：取消置顶 |

### 4.4 文件与媒体（files-media/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `files-media/archives` | `archive` | 文件消息：压缩包 |
| `files-media/doc` | `file-text` | 文件消息：文档 |
| `files-media/doc_on_doc` | `copy` | 消息交互：复制 |
| `files-media/file` | `file` | 输入：文件、文件消息默认、群文件 |
| `files-media/folder` | `folder` | H5 输入：文件、合并消息文件夹 |
| `files-media/img` | `image` | 输入：图片、文件消息：图片 |

### 4.5 音视频类（audio-video/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `audio-video/camera` | `camera` | H5 输入：拍照 |
| `audio-video/mic` | `mic` | 输入：语音、H5 语音面板 |
| `audio-video/phone_pick` | `phone` | 用户卡片：语音通话 |
| `audio-video/speaker_wave_2` | `volume-2` | 文件消息：音频预览 |
| `audio-video/speaker_xmark` | `volume-x` | Story 占位 |
| `audio-video/video_camera` | `video` | 用户卡片：视频通话、输入：视频、文件消息 |

### 4.6 用户与人（people/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `people/person_3lines_fill` | `contact` | 通讯录入口 |
| `people/person_add` | `user-plus` | 会话列表：添加联系人 |
| `people/person_double_fill` | `users` | 会话列表：创建群组 |
| `people/person_single` | `user` | Story：单用户 |

### 4.7 杂项（misc/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `misc/bell` | `bell` | 会话项：提醒 |
| `misc/gear` | `settings` | Story 设置 |
| `misc/globe_asia-australia` | `globe` | 消息交互：翻译 |
| `misc/lock` | `lock` | Story 锁定 |
| `misc/magnifier2` | `search` | 输入搜索、通讯录搜索、转发搜索、Mention 搜索 |

### 4.8 导航（navigation/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `navigation/chevron_left` | `chevron-left` | 通讯录返回 |
| `navigation/chevron_right` | `chevron-right` | Cell 右侧箭头、联系人导航 |

### 4.9 表情（emojis-reactions/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `emojis-reactions/face` | `smile` | 输入：表情 |

### 4.10 空状态（empty/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `empty/mentions` | `at-sign` | @ 提及无结果 |

### 4.11 消息状态/反馈（status/）

| 内部名称 | 原 Lucide 源 | 当前用途 |
|----------|--------------|----------|
| `status/error` | `circle-x` | Toast error、消息发送失败 |
| `status/success` | `circle-check` | Toast success |
| `status/warning` | `alert-triangle` | Toast warning |

---

## 5. 非 Lucide / 设计师原创 / 业务新增图标（64 个）

以下图标无 Lucide 对应，为项目自定义或设计师原创，无需参考 Lucide 源。

### 5.1 通用动作类（actions/）

- `actions/ban`
- `actions/checkbox_checked`
- `actions/copy`
- `actions/ellipsis_circle`
- `actions/eye`
- `actions/eye_off`
- `actions/items_check`
- `actions/loading_2colors`
- `actions/loading_arc`
- `actions/lock_dot`
- `actions/menu`
- `actions/minus`
- `actions/minus_in_circle`
- `actions/minus_in_rectangle`
- `actions/minus_in_rectangle_alt`
- `actions/radio_checked`
- `actions/shield_person`
- `actions/shield_xmark`
- `actions/unchecked_rectangle`
- `actions/xmark_in_rectangle`

### 5.2 箭头类（arrows/）

- `arrows/arrow_Uturn_clockwise`
- `arrows/arrow_down`
- `arrows/arrow_left`

### 5.3 音视频类（audio-video/）

- `audio-video/mic_off`
- `audio-video/play`
- `audio-video/speaker_wave`
- `audio-video/speaker_wave_1`
- `audio-video/video_camera_off`

### 5.4 消息相关（chat/）

- `chat/bubble`
- `chat/bubble_horizontal`
- `chat/bubble_rect`
- `chat/bubble_slash`
- `chat/quote`

### 5.5 文件与媒体（files-media/）

- `files-media/file_audio`
- `files-media/file_img`
- `files-media/file_pdf`
- `files-media/file_ppt`
- `files-media/file_video`
- `files-media/file_xls`
- `files-media/img_in_rectangle`

### 5.6 杂项（misc/）

- `misc/arrow_left_in_rect`
- `misc/arrow_right_in_rect`
- `misc/at`
- `misc/bell_slash`
- `misc/candle`
- `misc/candle_in_rect`
- `misc/flower`
- `misc/hanzi_in_rect`
- `misc/hanzi_in_rect_slash`
- `misc/hanzinalpha_in_rect`
- `misc/hanzinalpha_in_rect_slash`
- `misc/search_clear`
- `misc/triangle`
- `misc/triangle_in_rect`

### 5.7 导航（navigation/）

- `navigation/chevron_down`
- `navigation/chevron_left_right`
- `navigation/chevron_up`
- `navigation/chevron_up_down`

### 5.8 用户与人（people/）

- `people/person_circle`

### 5.9 消息状态/反馈（status/）

- `status/circle`
- `status/circle_check`
- `status/circle_warning`
- `status/dot`
- `status/dot_check`

---

## 6. 当前已知问题与优先修复项

### 6.1 图标「糊了」问题

- **根因**：部分图标在渲染时被强制缩放到非 24 整数倍尺寸，或 SVG 本身 viewBox/路径未对齐像素网格。
- **建议**：
  - 所有图标重绘时对齐 `24×24` 网格，路径端点落在整数坐标或半像素上。
  - 避免在 `16px` 以下展示复杂双勾、盾牌、皇冠等细节图标；必要时提供 `16px` 简化版。
  - 交付时标注「最小可用尺寸」。

### 6.2 主题色跟随不一致

- **现象**：部分图标不跟随主题色，默认黑色；深色模式下行为不一致。
- **建议**：
  - 统一使用单色描边，颜色由 CSS 变量控制。
  - 语义状态（danger/success/warning）使用独立色值，不依赖主题色。

### 6.3 重复/可合并图标

| 重复组 | 建议 |
|--------|------|
| `actions/check` / `actions/check_2` / `chat/doneAll` | 保留一个「对勾」基础形，双勾用于已读/编辑完成 |
| `chat/pin` / `chat/pinned` | 区分为「置顶操作」与「已置顶状态」 |
| `audio-video/mic` / `audio-video/mic_on` | 区分为「语音入口」与「录音中」 |
| `people/person_double_fill` / `people/member_group` / `empty/contact/group/members` | 统一群组/多人语义 |

### 6.4 语义不清的图标

- `arrows/arrow_n_line`、`arrows/line_n_arrow`：会话项消息状态语义弱，建议改为清晰的「已发送 / 已送达 / 已读」状态组。
- `arrows/arrowto`：用于返回上级，建议改为 `chevron-left`。

---

## 7. 当前待补充资源清单（给设计师）

> 以下资源是当前 UIKIT 仍在使用 Lucide、或已有实现但图标缺失/不完整的部分，建议设计师按优先级补齐。

### 7.1 高优先级：仍需替换的 Lucide 源图标（14 个）

这些图标当前仍直接复制自 Lucide，建议优先提供自绘版本，逐步消除第三方依赖。

| 内部路径 | 当前 Lucide 源 | 用途 | 建议 |
|----------|----------------|------|------|
| `audio-video/mic_on` | `mic` | H5 语音输入 | 区分「按住录音 / 录音中」状态 |
| `empty/blocklist` | `shield-off` | 暂无黑名单成员 | 提供空状态插画 |
| `empty/chat` | `message-square` | 请选择会话 / 合并消息空 | 提供空状态插画 |
| `empty/contact` | `users` | 暂无联系人 | 提供空状态插画 |
| `empty/conversation` | `message-circle` | 暂无会话 | 提供空状态插画 |
| `empty/files` | `folder-open` | 暂无群文件 | 提供空状态插画 |
| `empty/group` | `users` | 暂无群组 | 提供空状态插画，建议与 `empty/contact` 区分 |
| `empty/members` | `users` | 暂无成员 | 提供空状态插画，建议与 `empty/group` 区分 |
| `empty/mutelist` | `volume-x` | 暂无禁言成员 | 提供空状态插画 |
| `empty/read-receipt` | `check-check` | 已读回执空 | 提供空状态插画 |
| `empty/search` | `search-x` | 搜索无结果 | 提供空状态插画 |
| `misc/map_pin` | `map-pin` | 位置消息图标 | 提供自绘版本 |
| `people/member_group` | `users` | Story：群成员 | 建议与 `person_double_fill` 合并或区分 |
| `status/info` | `info` | Toast info | 提供自绘版本 |

### 7.2 高优先级：当前实现缺失或不完整的图标

以下功能在代码中已有引用或预留，但缺少对应图标资源，导致运行时可能 fallback 为其他图标或不显示。

#### H5 输入区域

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `input/keyboard` | ❌ 缺失 | 语音输入后切回键盘 |
| `input/emoji` | ❌ 缺失 | 展开表情面板（与 `emojis-reactions/face` 区分） |
| `input/send` | ❌ 缺失 | 发送按钮 |
| `input/voice_wave` | ❌ 缺失 | 录音中波形/动效 |
| `input/attachment` | ❌ 缺失 | 附件通用入口 |

#### 消息气泡状态（经典风格下仍用 Lucide）

> 注：数字胶囊风格已提供 `status/circle`、`status/circle_check`、`status/dot`、`status/dot_check`、`status/circle_warning`；经典风格仍依赖 Lucide，建议补齐自绘版本。

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `message/status_sending` | ⚠️ 静态 `actions/loading_circle` | 发送中（需动效规范） |
| `message/status_failed` | ✅ 已替换为 `misc/candle`（圆圈感叹号） | 发送失败 |
| `message/status_sent` | ⚠️ 共用 `chat/doneAll` | 已发送 |
| `message/status_delivered` | ⚠️ 共用 `chat/doneAll` | 已送达 |
| `message/status_read` | ⚠️ 共用 `chat/doneAll` | 已读 |
| `message/status_retry` | ❌ 缺失 | 重发 |

#### 会话列表标记

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `conversation/draft` | ❌ 缺失 | 草稿标记 |
| `conversation/mention` | ❌ 缺失 | @ 提及标记 |
| `conversation/typing` | ❌ 缺失 | 对方正在输入 |

#### 群管理

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `group/admin_badge` | ⚠️ 共用 `actions/shield` | 管理员标识 |
| `group/owner_badge` | ⚠️ 共用 `actions/crown` | 群主标识 |
| `group/mute_all` | ❌ 缺失 | 全员禁言 |
| `group/mute_expire` | ❌ 缺失 | 禁言到期时间 |
| `group/join_request` | ❌ 缺失 | 入群申请 |
| `group/allowlist` | ❌ 缺失 | 白名单 |
| `group/announcement` | ❌ 缺失 | 群公告 |
| `group/shared_files` | ⚠️ 共用 `files-media/folder` | 群文件入口 |

#### 联系人 / 关系链

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `contact/request_pending` | ❌ 缺失 | 待验证 |
| `contact/unblock` | ⚠️ 共用 `actions/user-check` | 取消拉黑 |

#### 在线状态（Presence）

当前在线状态使用勾选图标，建议提供小圆点/小图标：

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `presence/online` | ❌ 缺失 | 在线 |
| `presence/busy` | ❌ 缺失 | 忙碌 |
| `presence/away` | ❌ 缺失 | 离开 |
| `presence/offline` | ❌ 缺失 | 离线 |
| `presence/custom` | ❌ 缺失 | 自定义状态 |

#### 空状态插画

| 建议名称 | 当前状态 | 用途 |
|----------|----------|------|
| `empty/no_network` | ❌ 缺失 | 无网络 |
| `empty/error` | ❌ 缺失 | 加载失败 |
| `empty/notifications` | ❌ 缺失 | 无通知 |

### 7.3 中优先级：需要复核语义/合并重复的图标

| 问题 | 涉及图标 | 建议 |
|------|----------|------|
| 对勾语义重复 | `actions/check`、`actions/check_2`、`chat/doneAll` | 保留一个基础对勾，双勾用于已读/编辑完成 |
| 置顶状态与操作未区分 | `chat/pin`、`chat/pinned` | 区分为「置顶操作」与「已置顶状态」 |
| 麦克风状态未区分 | `audio-video/mic`、`audio-video/mic_on` | 区分为「语音入口」与「录音中」 |
| 群组/多人语义重复 | `people/person_double_fill`、`people/member_group`、`empty/contact/group/members` | 统一群组/多人语义 |
| 返回上级语义不清 | `arrows/arrowto` | 建议改为 `chevron-left` |
| 会话项消息状态语义弱 | `arrows/arrow_n_line`、`arrows/line_n_arrow` | 改为清晰的「已发送 / 已送达 / 已读」状态组 |

---

## 8. 设计师交付 Checklist

- [ ] 提供仍在沿用的 **14 个** Lucide 图标的自绘版本（按上表路径命名）
- [ ] 补齐 **7.2 高优先级缺失资源** 中标记为 ❌ 的图标
- [ ] 复核已替换的 **69 个**设计师图标，确认语义与当前用途匹配
- [ ] 复核非 Lucide 的 **64 个**自定义图标，确认风格统一
- [ ] 所有图标统一 `24×24` viewBox，单色描边，支持 `currentColor`
- [ ] 状态类图标（success/warning/danger/info）提供推荐色值
- [ ] 为复杂图标提供 `16px` 简化版本（如皇冠、盾牌、双勾）
- [ ] 提供一份「最小可用尺寸」标注
- [ ] 确认深色模式下图标颜色由代码变量控制，无需单独出图
- [ ] 如有品牌色/主题色变化，提供色板映射表

---

## 9. 开发侧替换流程

设计师交付后，开发同学按以下步骤替换：

1. 将新 SVG 按 `packages/uikit-core/src/assets/icons/分类/图标名.svg` 覆盖原文件（P1 Step 4 起图标库归 core）。
2. 运行 `pnpm -F @easemob/uikit-im icons:check`（或 `pnpm -F @easemob/uikit-core icons:check`），确认无缺失引用。
3. 运行 `pnpm -F @easemob/uikit-core build && pnpm -F @easemob/uikit-im build`，确认构建通过。
4. 在 demo 中检查关键页面：会话列表、聊天页、群详情、联系人详情、转发 Modal。
5. 如需新增图标，同步更新 `scripts/vendor-lucide-icons.mjs` 中的 `ADD_ICONS` 映射（非 Lucide 源可跳过）。

---

## 10. 扫描方法（可复现）

本次清单由以下脚本扫描生成，可定期重新运行以追踪 Lucide 替换进度：

```bash
cd packages/uikit-core
node scripts/scan-lucide-icons.mjs
```

扫描逻辑：读取 `scripts/vendor-lucide-icons.mjs` 中的 `ICON_MAP` / `ADD_ICONS` 映射，将 `src/assets/icons/` 下每个 SVG 与 `node_modules/lucide-static/icons/` 中对应 Lucide 源文件做内容比对；内容完全一致者列为「仍是 Lucide 源」，内容不同者列为「已替换为设计师版本」，无映射者列为「非 Lucide / 自定义」。

---

## 附录：Lucide 许可声明

本项目仍在沿用的图标基于 [Lucide](https://lucide.dev/)，许可证为 ISC。完整许可文本见：

```
packages/uikit-im/src/assets/icons/LICENSE.lucide.txt
```

如设计师提供自绘图标替换 Lucide 图标，建议在产品文档或 README 中保留类似声明，直至全部替换为非 Lucide 图标。
