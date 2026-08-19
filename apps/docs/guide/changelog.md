# 更新日志

本页内容与仓库根 `CHANGELOG.md` 保持单一数据源，构建时由脚本自动拆分为三个包的更新日志；发版时只需更新根 CHANGELOG，本页无需手动修改版本段。

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
<template #chatroom>

<!-- @include: ../.vitepress/gen/changelog-chatroom.md -->

</template>
</ChangelogTabs>
