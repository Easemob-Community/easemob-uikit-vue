import { URL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { vitepressDemo } from 'vite-plugin-vitepress-demo'

// 从 uikit 包读取当前版本，注入到文档站（首页徽章 / 页脚）
const uikitPkg = JSON.parse(
  readFileSync(new URL('../../packages/uikit/package.json', import.meta.url), 'utf-8'),
)

export default defineConfig({
  plugins: [
    vitepressDemo(),
  ],
  resolve: {
    alias: {
      '@easemob/uikit': fileURLToPath(new URL('../../packages/uikit/src', import.meta.url)),
    },
  },
  define: {
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitPkg.version),
  },
})
