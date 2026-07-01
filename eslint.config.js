import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
    rules: {
      'style/semi': ['error', 'never'],
      'style/quotes': ['error', 'single'],
      'style/indent': ['error', 2],
      // UIKit 公开事件统一使用 kebab-case（组件对外 API 约定），与默认 camelCase 冲突，故对齐为 kebab-case
      'vue/custom-event-name-casing': ['error', 'kebab-case'],
    },
  },
  {
    // Histoire story 文件是开发期演示，允许 console / alert 用于交互展示
    files: ['**/*.story.vue'],
    rules: {
      'no-console': 'off',
      'no-alert': 'off',
    },
  },
)
