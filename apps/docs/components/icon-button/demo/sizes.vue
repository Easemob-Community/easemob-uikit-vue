<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    "
  >
    <div
      style="
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 16px;
        border-radius: 8px;
        background: var(--uikit-bg-base);
      "
    >
      <em-icon-button icon="actions/edit" size="small" />
      <em-icon-button icon="actions/edit" size="medium" />
      <em-icon-button icon="actions/close" :icon-size="20" title="关闭" />
      <em-icon-button icon="navigation/chevron_left" :icon-size="24" title="返回" />
    </div>
    <div
      style="
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 16px;
        border-radius: 8px;
        background: var(--uikit-bg-base);
      "
    >
      <em-icon-button icon="actions/trash" disabled />
      <em-icon-button icon="actions/trash" variant="solid" disabled />
    </div>
  </div>
</template>
