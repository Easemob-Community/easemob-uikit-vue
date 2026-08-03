<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    "
  >
    <div
      style="
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: center;
      "
    >
      <em-button disabled>
        Disabled
      </em-button>
      <em-button loading>
        Loading
      </em-button>
    </div>
    <em-button block>
      Block
    </em-button>
  </div>
</template>
