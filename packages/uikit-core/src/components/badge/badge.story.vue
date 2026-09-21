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
        <Badge dot size="xs">
          <Avatar name="XS" />
        </Badge>
        <Badge :count="8" size="s">
          <Avatar name="S" />
        </Badge>
        <Badge :count="8" size="m">
          <Avatar name="M" />
        </Badge>
        <Badge :count="8" size="l">
          <Avatar name="L" />
        </Badge>
        <Badge :count="8" size="xl">
          <Avatar name="XL" />
        </Badge>
        <Badge :count="8" size="xxl">
          <Avatar name="2L" />
        </Badge>
      </div>
      <div class="u-flex u-gap-4">
        <Badge :count="88" size="s">
          <Avatar name="S2" />
        </Badge>
        <Badge :count="88" size="m">
          <Avatar name="M2" />
        </Badge>
        <Badge :count="88" size="l">
          <Avatar name="L2" />
        </Badge>
        <Badge :count="88" size="xl">
          <Avatar name="X2" />
        </Badge>
        <Badge :count="888" size="xxl">
          <Avatar name="23" />
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
    <Variant title="Inline（行尾未读数）">
      <!-- 模拟会话列表项（u-* 工具类在 story 环境未定义，关键布局走内联样式）：
           徽标右边缘应与时间右边缘对齐，垂直居中于行 -->
      <div style="display: flex; flex-direction: column; gap: 4px; width: 280px">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 20px">
          <span style="font-size: 15px">normal</span>
          <span style="font-size: 11px; color: #919ba1">HH:MM</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; min-height: 18px">
          <span style="font-size: 13px; color: #5e686e">the lasted msg</span>
          <Badge :count="13" size="l" inline />
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; min-height: 18px">
          <span style="font-size: 13px; color: #5e686e">muted conversation</span>
          <Badge dot size="xs" inline />
        </div>
      </div>
    </Variant>
    <Variant title="Placement & Bordered">
      <div class="u-flex u-gap-4">
        <Badge :count="8" placement="top-right">
          <Avatar name="TR" />
        </Badge>
        <Badge :count="8" placement="bottom-right">
          <Avatar name="BR" />
        </Badge>
        <Badge :count="8" placement="bottom-right" bordered>
          <Avatar name="BB" />
        </Badge>
        <Badge dot placement="bottom-right" bordered color="var(--uikit-presence-online-color, #6CE191)">
          <Avatar name="ON" />
        </Badge>
      </div>
    </Variant>
  </Story>
</template>
