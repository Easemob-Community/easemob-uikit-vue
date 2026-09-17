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
    <em-avatar name="A" :size="48" :badge="8" />
    <em-avatar name="B" :size="48" :badge="128" />
    <em-avatar name="C" :size="48" badge-dot />
    <em-avatar name="D" :size="48" :badge="8" badge-placement="bottom-right" />
    <em-avatar name="E" :size="48" :badge="8" presence="online" />
    <em-avatar name="F" :size="48" :badge="8" shape="square" />
  </div>
</template>
