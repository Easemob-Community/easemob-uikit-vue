import { resolve } from 'node:path'
import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  storyMatch: ['src/**/*.story.vue'],
  setupFile: '/src/histoire-setup.ts',
  vite: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        // story 内允许直接写包名引用（与 uikit-im 侧别名策略一致）
        '@easemob/uikit-core': resolve(__dirname, 'src'),
      },
    },
  },
})
