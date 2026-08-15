<script setup lang="ts">
import Avatar from './avatar.vue'
</script>

<template>
  <Story title="Avatar">
    <Variant title="Image">
      <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" name="Felix" />
    </Variant>
    <Variant title="Text">
      <Avatar name="张三" />
    </Variant>
    <Variant title="Sizes">
      <div class="u-flex u-gap-2 u-items-center">
        <Avatar name="A" :size="24" />
        <Avatar name="B" :size="40" />
        <Avatar name="C" :size="60" />
      </div>
    </Variant>
    <Variant title="Shapes">
      <div class="u-flex u-gap-2">
        <Avatar name="Circle" shape="circle" />
        <Avatar name="Square" shape="square" />
      </div>
    </Variant>
    <Variant title="Presence">
      <div class="u-flex u-gap-2 u-items-center">
        <Avatar name="Online" presence="online" />
        <Avatar name="Away" presence="away" />
        <Avatar name="Busy" presence="busy" />
        <Avatar name="Offline" presence="offline" />
        <Avatar name="Custom" presence="custom" />
      </div>
    </Variant>
    <Variant title="Presence Sizes">
      <div class="u-flex u-gap-2 u-items-center">
        <Avatar name="S" :size="24" presence="online" />
        <Avatar name="M" :size="40" presence="online" />
        <Avatar name="L" :size="60" presence="online" />
        <Avatar name="CustomDot" :size="40" presence="online" :presence-size="16" />
      </div>
    </Variant>
    <Variant title="Editable">
      <Avatar name="Me" presence="online" editable @presence-click="console.log('presence-click')" />
    </Variant>
  </Story>
</template>
