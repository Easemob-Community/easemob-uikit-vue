import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'
import unocss from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [HstVue()],
  storyMatch: ['src/**/*.story.vue'],
  setupFile: '/src/histoire-setup.ts',
  vite: {
    plugins: [
      unocss(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  },
})
