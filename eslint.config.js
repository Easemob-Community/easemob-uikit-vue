import antfu from '@antfu/eslint-config'

export default antfu({
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
  },
})
