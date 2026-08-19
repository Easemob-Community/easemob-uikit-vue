<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    "
  >
    <div
      style="
        width: 360px;
        background: var(--uikit-bg-base);
        border-radius: 8px;
      "
    >
      <em-empty icon="empty/contact" title="暂无联系人" description="你可以通过搜索添加新的联系人" />
    </div>
    <div
      style="
        width: 360px;
        background: var(--uikit-bg-base);
        border-radius: 8px;
      "
    >
      <em-empty icon="empty/chat" title="尚未选择会话" description="从左侧选择一个会话开始聊天" />
    </div>
    <div
      style="
        width: 360px;
        background: var(--uikit-bg-base);
        border-radius: 8px;
      "
    >
      <em-empty icon="empty/group" title="暂无群组" description="你可以通过搜索或创建加入群组" />
    </div>
    <div
      style="
        width: 360px;
        background: var(--uikit-bg-base);
        border-radius: 8px;
      "
    >
      <em-empty icon="empty/search" title="未找到结果" description="换个关键词试试" />
    </div>
  </div>
</template>
