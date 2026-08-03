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
      <em-icon-button icon="actions/plus" variant="solid" />
      <em-icon-button icon="actions/plus" variant="outline" />
      <em-icon-button icon="actions/plus" variant="ghost" />
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
      <em-icon-button icon="actions/check" type="default" variant="solid" />
      <em-icon-button icon="actions/check" type="primary" variant="solid" />
      <em-icon-button icon="actions/check" type="success" variant="solid" />
      <em-icon-button icon="actions/check" type="warning" variant="solid" />
      <em-icon-button icon="actions/xmark_thick" type="danger" variant="solid" />
    </div>
  </div>
</template>
