<script setup lang="ts">
import IconButton from './icon-button.vue'
</script>

<template>
  <Story title="IconButton">
    <Variant title="变体 Variant">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="plus" variant="solid" />
        <IconButton icon="plus" variant="outline" />
        <IconButton icon="plus" variant="ghost" />
      </div>
    </Variant>

    <Variant title="语义类型 Type">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="check/single" type="default" variant="solid" />
        <IconButton icon="check/single" type="primary" variant="solid" />
        <IconButton icon="check/single" type="success" variant="solid" />
        <IconButton icon="check/single" type="warning" variant="solid" />
        <IconButton icon="xmark/bold" type="danger" variant="solid" />
      </div>
    </Variant>

    <Variant title="尺寸 Size">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="rect/pencil" size="small" />
        <IconButton icon="rect/pencil" size="medium" />
      </div>
    </Variant>

    <Variant title="禁用 Disabled">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="trash" disabled />
        <IconButton icon="trash" variant="solid" disabled />
      </div>
    </Variant>

    <Variant title="自定义尺寸与提示">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="xmark/light" :icon-size="20" title="关闭" />
        <IconButton icon="chevron/left" :icon-size="24" title="返回" />
      </div>
    </Variant>
  </Story>
</template>
