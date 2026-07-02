/// <reference types="node" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: true,
    }),
    AutoImport({
      imports: ['vue'],
      dts: true,
    }),
  ],
  resolve: {
    alias: {
      '@easemob/uikit': resolve(__dirname, '../../packages/uikit/src'),
    },
  },
})
