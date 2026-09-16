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
    <em-text color="primary">
      primary 主文本
    </em-text>
    <em-text color="secondary">
      secondary 次级文本
    </em-text>
    <em-text color="tertiary">
      tertiary 弱化文本
    </em-text>
    <span
      style="
        padding: 4px 12px;
        border-radius: 6px;
        background: var(--uikit-primary-color);
      "
    >
      <em-text color="inverse">inverse 反色文本</em-text>
    </span>
  </div>
</template>
