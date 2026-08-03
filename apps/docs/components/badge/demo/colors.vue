<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      align-items: center;
      justify-content: center;
    "
  >
    <em-badge :count="3" color="#3b82f6">
      <em-avatar name="A" />
    </em-badge>
    <em-badge :count="5" color="#10b981">
      <em-avatar name="B" />
    </em-badge>
    <em-badge dot color="#f59e0b">
      <em-avatar name="C" />
    </em-badge>
  </div>
</template>
