<script setup lang="ts">
import Empty from './empty.vue'
import Button from '../button/button.vue'
</script>

<template>
  <Story title="Empty">
    <Variant title="联系人空态">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty icon="empty/contact" title="暂无联系人" description="你可以通过搜索添加新的联系人" />
      </div>
    </Variant>

    <Variant title="聊天空态">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty icon="empty/chat" title="尚未选择会话" description="从左侧选择一个会话开始聊天" />
      </div>
    </Variant>

    <Variant title="群组空态">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty icon="empty/group" title="暂无群组" description="你可以通过搜索或创建加入群组" />
      </div>
    </Variant>

    <Variant title="搜索无结果">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty icon="empty/search" title="未找到结果" description="换个关键词试试" />
      </div>
    </Variant>

    <Variant title="默认线描插画">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty illustration title="暂无数据" description="数据加载失败或为空" />
      </div>
    </Variant>

    <Variant title="尺寸">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty icon="empty/files" title="Small" description="弹窗/抽屉内使用" size="small" />
        <Empty icon="empty/files" title="Normal" description="列表中使用（默认）" size="normal" />
        <Empty icon="empty/files" title="Large" description="页面级使用" size="large" />
      </div>
    </Variant>

    <Variant title="行动按钮">
      <div style="width: 360px; background: var(--uikit-bg-base); border-radius: 8px;">
        <Empty illustration title="暂无联系人" description="点击下方按钮添加新朋友">
          <template #action>
            <Button type="primary">添加联系人</Button>
          </template>
        </Empty>
      </div>
    </Variant>
  </Story>
</template>
