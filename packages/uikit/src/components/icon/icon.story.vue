<script setup lang="ts">
import Icon from './icon.vue'
</script>

<template>
  <Story title="Icon">
    <Variant title="Sizes">
      <div class="u-flex u-gap-4 u-items-center">
        <Icon name="check" :size="16">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Icon>
        <Icon name="check" :size="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Icon>
        <Icon name="check" :size="32">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Icon>
      </div>
    </Variant>
    <Variant title="Colors">
      <div class="u-flex u-gap-4">
        <Icon name="circle" color="#3b82f6">
          <circle cx="12" cy="12" r="10" />
        </Icon>
        <Icon name="square" color="#ef4444">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </Icon>
        <Icon name="triangle" color="#10b981">
          <polygon points="12 2 22 22 2 22" />
        </Icon>
      </div>
    </Variant>
  </Story>
</template>
