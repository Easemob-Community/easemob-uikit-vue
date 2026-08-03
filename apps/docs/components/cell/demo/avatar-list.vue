<template>
  <div
    style="
      width: 320px;
      background: var(--uikit-bg-base);
      border-radius: 8px;
      overflow: hidden;
    "
  >
    <em-cell title="张三" subtitle="签名：Hello World" border>
      <template #leading>
        <em-avatar name="张三" :size="40" />
      </template>
      <template #trailing>
        <em-badge :count="5" />
      </template>
    </em-cell>
    <em-cell title="李四" subtitle="在线" border>
      <template #leading>
        <em-avatar name="李四" :size="40" />
      </template>
    </em-cell>
    <em-cell title="群组交流群" meta="128" show-arrow>
      <template #leading>
        <em-avatar name="群" :size="40" />
      </template>
    </em-cell>
  </div>
</template>
