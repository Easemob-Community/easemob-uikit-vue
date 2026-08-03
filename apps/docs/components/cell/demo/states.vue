<template>
  <div
    style="
      width: 320px;
      background: var(--uikit-bg-base);
      border-radius: 8px;
      overflow: hidden;
    "
  >
    <em-cell title="Compact" subtitle="48px" size="compact" border>
      <template #leading>
        <em-avatar name="C" :size="32" />
      </template>
    </em-cell>
    <em-cell title="Normal" subtitle="64px" size="normal" border>
      <template #leading>
        <em-avatar name="N" :size="40" />
      </template>
    </em-cell>
    <em-cell title="Large" subtitle="72px" size="large">
      <template #leading>
        <em-avatar name="L" :size="48" />
      </template>
    </em-cell>
    <em-cell title="默认状态" border />
    <em-cell title="激活状态" active border />
    <em-cell title="禁用状态" disabled border />
  </div>
</template>
