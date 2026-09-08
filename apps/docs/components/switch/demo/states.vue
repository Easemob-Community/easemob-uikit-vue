<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: center;
    "
  >
    <em-switch :model-value="false" disabled />
    <em-switch :model-value="true" disabled />
    <em-switch :model-value="false" size="small" disabled />
    <em-switch :model-value="true" size="small" disabled />
  </div>
</template>
