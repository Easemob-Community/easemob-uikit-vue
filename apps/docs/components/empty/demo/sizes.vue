<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    "
  >
    <div
      style="
        width: 360px;
        background: var(--uikit-bg-base);
        border-radius: 8px;
      "
    >
      <em-empty icon="empty/files" title="Small" description="弹窗/抽屉内使用" size="small" />
      <em-empty icon="empty/files" title="Normal" description="列表中使用（默认）" size="normal" />
      <em-empty icon="empty/files" title="Large" description="页面级使用" size="large" />
    </div>
    <div
      style="
        width: 360px;
        background: var(--uikit-bg-base);
        border-radius: 8px;
      "
    >
      <em-empty illustration title="默认插画" description="未传 icon 时使用内置线描插画" />
      <em-empty icon="empty/contact" title="仅标题">
        <template #description>
          自定义描述插槽内容
        </template>
      </em-empty>
      <em-empty illustration title="暂无联系人" description="点击下方按钮添加新朋友">
        <template #action>
          <button
            style="
              padding: 6px 16px;
              border-radius: 8px;
              background: var(--uikit-primary-color);
              color: #fff;
              border: none;
              cursor: pointer;
            "
          >
            添加联系人
          </button>
        </template>
      </em-empty>
    </div>
  </div>
</template>
