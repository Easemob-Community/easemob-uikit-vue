import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [HstVue()],
  storyMatch: ['src/**/*.story.vue'],
  setupFile: '/src/histoire-setup.ts',
  vite: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  },
})
