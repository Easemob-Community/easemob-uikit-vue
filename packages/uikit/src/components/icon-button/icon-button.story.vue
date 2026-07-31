<script setup lang="ts">
import IconButton from './icon-button.vue'
</script>

<template>
  <Story title="IconButton">
    <Variant title="变体 Variant">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="actions/plus" variant="solid" />
        <IconButton icon="actions/plus" variant="outline" />
        <IconButton icon="actions/plus" variant="ghost" />
      </div>
    </Variant>

    <Variant title="语义类型 Type">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="actions/check" type="default" variant="solid" />
        <IconButton icon="actions/check" type="primary" variant="solid" />
        <IconButton icon="actions/check" type="success" variant="solid" />
        <IconButton icon="actions/check" type="warning" variant="solid" />
        <IconButton icon="actions/xmark_thick" type="danger" variant="solid" />
      </div>
    </Variant>

    <Variant title="尺寸 Size">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="actions/edit" size="small" />
        <IconButton icon="actions/edit" size="medium" />
      </div>
    </Variant>

    <Variant title="禁用 Disabled">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="actions/trash" disabled />
        <IconButton icon="actions/trash" variant="solid" disabled />
      </div>
    </Variant>

    <Variant title="自定义尺寸与提示">
      <div class="u-flex u-gap-2 u-items-center u-p-4" style="background: var(--uikit-bg-base); border-radius: 8px;">
        <IconButton icon="actions/close" :icon-size="20" title="关闭" />
        <IconButton icon="navigation/chevron_left" :icon-size="24" title="返回" />
      </div>
    </Variant>
  </Story>
</template>
