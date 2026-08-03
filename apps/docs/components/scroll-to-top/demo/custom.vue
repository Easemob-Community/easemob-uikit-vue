<template>
  <div
    style="
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    "
  >
    <div
      style="
        position: relative;
        height: 320px;
        overflow-y: auto;
        border: 1px solid var(--uikit-border-color, #e5e7eb);
        border-radius: 8px;
        flex: 1;
        min-width: 260px;
      "
    >
      <div
        v-for="i in 50"
        :key="i"
        style="
          padding: 12px 16px;
          border-bottom: 1px solid var(--uikit-border-light, #f3f4f6);
          font-size: 13px;
          color: var(--uikit-text-secondary, #6b7280);
        "
      >
        列表项 {{ i }}
      </div>
      <em-scroll-to-top
        icon="arrows/arrow_up_n_box"
        :size="44"
        :visibility-height="100"
        :right="20"
        :bottom="20"
      />
    </div>
    <div
      style="
        position: relative;
        height: 320px;
        overflow-y: auto;
        border: 1px solid var(--uikit-border-color, #e5e7eb);
        border-radius: 8px;
        flex: 1;
        min-width: 260px;
      "
    >
      <div
        v-for="i in 50"
        :key="i"
        style="
          padding: 12px 16px;
          border-bottom: 1px solid var(--uikit-border-light, #f3f4f6);
          font-size: 13px;
          color: var(--uikit-text-secondary, #6b7280);
        "
      >
        列表项 {{ i }}
      </div>
      <em-scroll-to-top :duration="150" :visibility-height="150" />
    </div>
  </div>
</template>
