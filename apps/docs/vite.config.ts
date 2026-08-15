import { URL, fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { vitepressDemo } from 'vite-plugin-vitepress-demo'

// 从 uikit 包读取当前版本，注入到文档站（首页徽章 / 页脚）
const uikitPkg = JSON.parse(
  readFileSync(new URL('../../packages/uikit-im/package.json', import.meta.url), 'utf-8'),
)

/**
 * 修正文档 demo 引用路径。
 *
 * vite-plugin-vitepress-demo 以 md 文件所在目录解析 `<demo src>`：
 * `components/button.md` 里的 `./demo/x.vue` 会被解析成 `components/demo/x.vue`，
 * 而真实 demo 位于 `components/button/demo/x.vue`，两者对不上导致所有 demo 都不渲染。
 * 此插件与 vitepressDemo 同为 enforce: pre，注册在其之前（数组顺序即执行顺序），
 * 将 `<name>.md` 中的 `./demo/` 重写为 `./<name>/demo/`（仅当该目录真实存在时）。
 */
function rewriteDemoSrc(): Plugin {
  return {
    name: 'docs:rewrite-demo-src',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]
      if (!file.endsWith('.md') || !code.includes('src="./demo/'))
        return
      const name = basename(file, '.md')
      if (!existsSync(resolve(dirname(file), name, 'demo')))
        return
      return code.replaceAll('src="./demo/', `src="./${name}/demo/`)
    },
  }
}

export default defineConfig({
  plugins: [
    rewriteDemoSrc(),
    vitepressDemo(),
  ],
  resolve: {
    alias: {
      '@easemob/uikit-im': fileURLToPath(new URL('../../packages/uikit-im/src', import.meta.url)),
    },
  },
  define: {
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitPkg.version),
  },
})
