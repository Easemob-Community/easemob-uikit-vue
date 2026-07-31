<script setup lang="ts">
import ContactEmpty from './contact-empty.vue'
</script>

<template>
  <Story title="Modules/ContactEmpty">
    <Variant title="默认（i18n 文案）">
      <div style="padding: 24px; max-width: 360px;">
        <ContactEmpty />
      </div>
    </Variant>

    <Variant title="自定义文案">
      <div style="padding: 24px; max-width: 360px;">
        <ContactEmpty text="还没有任何联系人，快去添加吧" />
      </div>
    </Variant>
  </Story>
</template>
