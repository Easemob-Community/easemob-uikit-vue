# 双 UIKit 架构

环信 UIKit 采用「共享基座 + 双场景包」的架构：**单群聊**与**聊天室**是两个并列的场景包，
各自独立构建、独立发布，共享同一基座，避免互相绑架：

| 包 | 场景 | 职责 |
| --- | --- | --- |
| `@easemob/uikit-core` | 共享基座 | sdk 抽象层、主题、i18n、常量、原子组件、Provider 生命周期 |
| `@easemob/uikit-im` | 单群聊 | 会话 / 通讯录 / 群组 / 聊天场景层（现有文档） |
| `@easemob/uikit-chatroom` | 聊天室 | 房间 / 消息流 / 成员 / 禁言 / 公告 / 房间属性 + 场景预设 |

## 为什么拆成两个包

聊天室（直播间、语聊房、小班课）与单群聊的语义几乎不重合：聊天室**无离线消息、无未读 /
回执、无会话列表**，消息是广播流；单群聊围绕会话 / 联系人 / 群组 / 回执体系构建。两者极少被
同一接入方同时需要——拆包让聊天室 H5 页面不必加载 tiptap、通讯录、群组代码，发布会互不绑架。

## 共享什么、不共享什么

- **共享**（进 `@easemob/uikit-core`）：client / ManagerHost 抽象、连接级事件、notification
  引擎、user-info / presence domain、主题与 i18n、常量与工具、通用原子组件、`EmUIKitProvider`
  生命周期、domain 无关的 H5 composables。
- **不共享**（各自场景包内）：单群聊的会话 / 通讯录 / 群组 / 消息 store 与模块；聊天室的房间
  状态机、广播消息流、成员管理、禁言、公告、房间属性与场景预设。

## 双文档切换

本站通过顶部标题旁的切换器在「单群聊 UIKit」与「聊天室 UIKit」两套文档之间切换：
`/` 前缀为单群聊文档（既有），`/chatroom/` 前缀为聊天室文档（建设中）。

## 设计文档

完整设计决策（三包边界、聊天室包内部设计、场景预设系统、分阶段计划）见仓库根目录
[CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-UIKIT-DESIGN.md)。
