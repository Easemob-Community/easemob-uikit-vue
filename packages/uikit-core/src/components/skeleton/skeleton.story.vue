<script setup lang="ts">
import Skeleton from './skeleton.vue'
</script>

<template>
  <Story title="Skeleton">
    <Variant title="Text">
      <Skeleton variant="text" style="width: 200px;" />
    </Variant>
    <Variant title="Avatar">
      <Skeleton variant="avatar" />
    </Variant>
    <Variant title="Paragraph">
      <Skeleton variant="paragraph" :rows="4" style="width: 240px;" />
    </Variant>
    <Variant title="Card">
      <Skeleton variant="card" style="width: 280px;" />
    </Variant>
    <Variant title="No Animation">
      <Skeleton variant="paragraph" :rows="3" :animated="false" style="width: 240px;" />
    </Variant>
  </Story>
</template>
