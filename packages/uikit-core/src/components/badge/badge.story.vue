<script setup lang="ts">
import Badge from './badge.vue'
import Avatar from '../avatar/avatar.vue'
</script>

<template>
  <Story title="Badge">
    <Variant title="Count">
      <div class="u-flex u-gap-4">
        <Badge :count="5">
          <Avatar name="A" />
        </Badge>
        <Badge :count="99">
          <Avatar name="B" />
        </Badge>
        <Badge :count="120">
          <Avatar name="C" />
        </Badge>
      </div>
    </Variant>
    <Variant title="Max">
      <div class="u-flex u-gap-4">
        <Badge :count="99" :max="99">
          <Avatar name="A" />
        </Badge>
        <Badge :count="100" :max="99">
          <Avatar name="B" />
        </Badge>
      </div>
    </Variant>
    <Variant title="Dot">
      <div class="u-flex u-gap-4">
        <Badge dot>
          <Avatar name="A" />
        </Badge>
      </div>
    </Variant>
    <Variant title="Custom Color">
      <div class="u-flex u-gap-4">
        <Badge :count="3" color="#3b82f6">
          <Avatar name="A" />
        </Badge>
        <Badge :count="5" color="#10b981">
          <Avatar name="B" />
        </Badge>
        <Badge dot color="#f59e0b">
          <Avatar name="C" />
        </Badge>
      </div>
    </Variant>
    <Variant title="Digital Capsule Sizes">
      <div class="u-flex u-gap-4">
        <Badge :count="8" size="normal">
          <Avatar name="N1" />
        </Badge>
        <Badge :count="88" size="normal">
          <Avatar name="N2" />
        </Badge>
        <Badge :count="888" size="normal">
          <Avatar name="N3" />
        </Badge>
        <Badge :count="8" size="small">
          <Avatar name="S1" />
        </Badge>
        <Badge :count="88" size="small">
          <Avatar name="S2" />
        </Badge>
        <Badge :count="888" size="small">
          <Avatar name="S3" />
        </Badge>
      </div>
    </Variant>
    <Variant title="Digital Capsule Variants">
      <div class="u-flex u-gap-4">
        <Badge :count="8" variant="filled">
          <Avatar name="F1" />
        </Badge>
        <Badge :count="88" variant="filled">
          <Avatar name="F2" />
        </Badge>
        <Badge :count="8" variant="stroked">
          <Avatar name="S1" />
        </Badge>
        <Badge :count="88" variant="stroked">
          <Avatar name="S2" />
        </Badge>
        <Badge dot variant="stroked">
          <Avatar name="SD" />
        </Badge>
      </div>
    </Variant>
  </Story>
</template>
