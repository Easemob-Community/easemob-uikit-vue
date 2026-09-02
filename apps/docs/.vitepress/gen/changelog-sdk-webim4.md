## @easemob/uikit-sdk-webim4 1.0.0 (2026-09-02)


### 新增

- **首次发布**：easemob-websdk 4.x（4.24.2，私有化）适配器——`Webim4Adapter`（内置 / 注入双模式）+ 六域 Domain + 单 `addEventHandler` 事件层归一化（批量 onMessage 逐条展开、read/delivery/channel 回执归一、流式增量、群事件 operation 分发）+ 字段/API 映射（合并/置顶/流式/已读回执全支持）+ 登录预取（对齐 5.x 同步体感）+ 漫游 pb 容错（坏消息跳过不拖垮整页）。4.x SDK 经 npm alias `easemob-websdk-4` 引入，与 5.x 同工程共存互不干扰。
