<script setup lang="ts">
import Avatar from '../avatar/avatar.vue'
import Badge from '../badge/badge.vue'
import Icon from '../icon/icon.vue'
import Cell from './cell.vue'
</script>

<template>
  <Story title="Cell">
    <Variant title="基础导航项">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <Cell title="禁言列表" meta="3" show-arrow border @click="() => {}" />
        <Cell title="黑名单" meta="12" show-arrow border @click="() => {}" />
        <Cell title="共享文件" show-arrow @click="() => {}" />
      </div>
    </Variant>

    <Variant title="头像列表项">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <Cell title="张三" subtitle="签名：Hello World" border>
          <template #leading>
            <Avatar name="张三" :size="40" />
          </template>
          <template #trailing>
            <Badge :count="5" />
          </template>
        </Cell>
        <Cell title="李四" subtitle="在线" border>
          <template #leading>
            <Avatar name="李四" :size="40" />
          </template>
        </Cell>
        <Cell title="群组交流群" meta="128" show-arrow>
          <template #leading>
            <Avatar name="群" :size="40" />
          </template>
        </Cell>
      </div>
    </Variant>

    <Variant title="操作行">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <Cell auto-height border @click="() => {}">
          <template #leading>
            <Icon name="actions/trash" :size="18" />
          </template>
          <template #default>清空聊天记录</template>
        </Cell>
        <Cell auto-height border @click="() => {}">
          <template #leading>
            <Icon name="actions/plus" :size="18" />
          </template>
          <template #default>添加成员</template>
        </Cell>
      </div>
    </Variant>

    <Variant title="尺寸">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <Cell title="Compact" subtitle="48px" size="compact" border>
          <template #leading>
            <Avatar name="C" :size="32" />
          </template>
        </Cell>
        <Cell title="Normal" subtitle="64px" size="normal" border>
          <template #leading>
            <Avatar name="N" :size="40" />
          </template>
        </Cell>
        <Cell title="Large" subtitle="72px" size="large">
          <template #leading>
            <Avatar name="L" :size="48" />
          </template>
        </Cell>
      </div>
    </Variant>

    <Variant title="状态">
      <div style="width: 320px; background: var(--uikit-bg-base); border-radius: 8px; overflow: hidden;">
        <Cell title="默认状态" border />
        <Cell title="激活状态" active border />
        <Cell title="禁用状态" disabled border />
      </div>
    </Variant>
  </Story>
</template>
