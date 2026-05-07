import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  storyMatch: ['src/**/*.story.vue'],
  vite: {
    plugins: [],
  },
})
