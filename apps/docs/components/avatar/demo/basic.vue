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
    <em-avatar
      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
      name="Felix"
    />
    <em-avatar name="张三" />
    <em-avatar name="A" :size="24" />
    <em-avatar name="B" :size="40" />
    <em-avatar name="C" :size="60" />
    <em-avatar name="Circle" shape="circle" />
    <em-avatar name="Square" shape="square" />
  </div>
</template>
