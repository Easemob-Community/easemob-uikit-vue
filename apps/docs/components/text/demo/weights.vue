<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
      justify-content: center;
    "
  >
    <em-text weight="regular">
      regular · 常规字重
    </em-text>
    <em-text weight="medium">
      medium · 中等字重
    </em-text>
    <em-text weight="semibold">
      semibold · 半粗字重
    </em-text>
    <em-text weight="bold">
      bold · 加粗字重
    </em-text>
    <em-text level="h3">
      h3 默认字重（semibold）
    </em-text>
    <em-text level="h3" weight="regular">
      h3 + weight 覆盖为 regular
    </em-text>
  </div>
</template>
