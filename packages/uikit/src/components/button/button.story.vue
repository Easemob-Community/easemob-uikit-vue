<script setup lang="ts">
import Button from './button.vue'
</script>

<template>
  <Story title="Button">
    <Variant title="Types">
      <div class="u-flex u-gap-2">
        <Button type="primary">Primary</Button>
        <Button type="success">Success</Button>
        <Button type="warning">Warning</Button>
        <Button type="danger">Danger</Button>
        <Button type="default">Default</Button>
      </div>
    </Variant>
    <Variant title="Sizes">
      <div class="u-flex u-gap-2 u-items-center">
        <Button size="small">Small</Button>
        <Button size="medium">Medium</Button>
        <Button size="large">Large</Button>
      </div>
    </Variant>
    <Variant title="States">
      <div class="u-flex u-gap-2">
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button block>Block</Button>
      </div>
    </Variant>
  </Story>
</template>
