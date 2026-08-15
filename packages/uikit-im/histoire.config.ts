import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [HstVue()],
  storyMatch: ['src/**/*.story.vue'],
  setupFile: '/src/histoire-setup.ts',
  vite: {
    resolve: {
      alias: [
        // theme @import 直指 core 源文件（必须排在 '@easemob/uikit-core' 主 alias 之前）
        { find: '@easemob/uikit-core/theme', replacement: resolve(__dirname, '../uikit-core/src/theme/index.css') },
        // story 直连 core 源码，与 demo 源码直连模式一致
        { find: '@easemob/uikit-core', replacement: resolve(__dirname, '../uikit-core/src') },
        { find: '@', replacement: resolve(__dirname, 'src') },
      ],
    },
  },
})
