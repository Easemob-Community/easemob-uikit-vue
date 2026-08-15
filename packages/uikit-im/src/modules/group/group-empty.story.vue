<script setup lang="ts">
import GroupEmpty from './group-empty.vue'
</script>

<template>
  <Story title="Modules/GroupEmpty">
    <Variant title="默认（i18n 文案）">
      <div style="padding: 24px; max-width: 360px;">
        <GroupEmpty />
      </div>
    </Variant>

    <Variant title="自定义文案">
      <div style="padding: 24px; max-width: 360px;">
        <GroupEmpty text="还没有加入任何群组" />
      </div>
    </Variant>
  </Story>
</template>
