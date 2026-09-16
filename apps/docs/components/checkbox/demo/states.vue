<template>
  <div
    style="
      display: flex;
      gap: 24px;
      align-items: center;
      justify-content: center;
    "
  >
    <em-checkbox :checked="false" />
    <em-checkbox :checked="true" />
    <em-checkbox :checked="false" disabled />
    <em-checkbox :checked="true" disabled />
  </div>
</template>
