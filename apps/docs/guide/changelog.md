# 更新日志

本页内容与仓库根 `CHANGELOG.md` 保持单一数据源，构建时由脚本自动拆分为各包的更新日志（一期暂不含 `@easemob/uikit-chatroom`）；发版时只需更新根 CHANGELOG，本页无需手动修改版本段。

::: tip 版本说明

- **重大版本**：包含破坏性变更，需要迁移
- **次要版本**：新增功能和优化，向下兼容
- **补丁版本**：问题修复，向下兼容

:::

<ChangelogTabs>
<template #im>

<!-- @include: ../.vitepress/gen/changelog-im.md -->

</template>
<template #core>

<!-- @include: ../.vitepress/gen/changelog-core.md -->

</template>
<!-- 【一期临时】下线聊天室更新日志 tab，恢复时取消注释（需同步恢复 ChangelogTabs.vue 的 tab 项与 split-changelog.mjs 的映射）
<template #chatroom>

@include: ../.vitepress/gen/changelog-chatroom.md

</template>
-->
<template #sdk-contract>

<!-- @include: ../.vitepress/gen/changelog-sdk-contract.md -->

</template>
<template #sdk-websdk5>

<!-- @include: ../.vitepress/gen/changelog-sdk-websdk5.md -->

</template>
<template #sdk-webim4>

<!-- @include: ../.vitepress/gen/changelog-sdk-webim4.md -->

</template>
</ChangelogTabs>
