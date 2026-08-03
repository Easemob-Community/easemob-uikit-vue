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
    <em-badge :count="5">
      <em-avatar name="A" />
    </em-badge>
    <em-badge :count="99">
      <em-avatar name="B" />
    </em-badge>
    <em-badge :count="120">
      <em-avatar name="C" />
    </em-badge>
    <em-badge :count="100" :max="99">
      <em-avatar name="D" />
    </em-badge>
    <em-badge dot>
      <em-avatar name="E" />
    </em-badge>
  </div>
</template>
