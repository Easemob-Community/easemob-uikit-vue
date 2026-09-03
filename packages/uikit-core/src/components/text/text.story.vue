<script setup lang="ts">
import Text from './text.vue'
</script>

<template>
  <Story title="Text">
    <Variant title="Levels">
      <div class="u-flex u-flex-col u-gap-2">
        <Text level="h0">
          H0 页面大标题 34/42
        </Text>
        <Text level="h1">
          H1 模块大标题 28/34
        </Text>
        <Text level="h2">
          H2 弹窗/模块标题 22/26
        </Text>
        <Text level="h3">
          H3 卡片/抽屉标题 18/24
        </Text>
        <Text level="body-lg">
          Body-LG 正文大字号 16/24
        </Text>
        <Text level="body">
          Body 默认正文 14/22
        </Text>
        <Text level="body-sm">
          Body-SM 辅助说明 13/20
        </Text>
        <Text level="caption">
          Caption 标签/提示 12/18
        </Text>
        <Text level="small">
          Small 徽标数字 10/14
        </Text>
        <Text level="mini">
          Mini 极小标签 8/12
        </Text>
      </div>
    </Variant>
    <Variant title="Weights">
      <div class="u-flex u-flex-col u-gap-2">
        <Text level="body" weight="regular">
          Regular 400 正文
        </Text>
        <Text level="body" weight="medium">
          Medium 500 强调
        </Text>
        <Text level="body" weight="semibold">
          Semibold 600 小标题
        </Text>
        <Text level="body" weight="bold">
          Bold 700 大标题
        </Text>
      </div>
    </Variant>
    <Variant title="Colors">
      <div class="u-flex u-flex-col u-gap-2">
        <Text color="primary">
          Primary 主文字
        </Text>
        <Text color="secondary">
          Secondary 次要文字
        </Text>
        <Text color="tertiary">
          Tertiary 辅助文字
        </Text>
        <Text color="inverse" style="background: var(--uikit-primary-color); padding: 0 4px;">
          Inverse 反白文字
        </Text>
      </div>
    </Variant>
    <Variant title="Ellipsis">
      <div style="width: 200px;">
        <Text ellipsis>
          这是一段很长很长的文本，超出容器宽度后会被单行截断并显示省略号
        </Text>
      </div>
    </Variant>
    <Variant title="Tag">
      <div class="u-flex u-flex-col u-gap-2">
        <Text level="h2" tag="h2">
          语义化 h2 标签
        </Text>
        <Text level="body" tag="p">
          段落 p 标签
        </Text>
      </div>
    </Variant>
  </Story>
</template>
