import { URL, fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { vitepressDemo } from 'vite-plugin-vitepress-demo'

// 从 uikit 包读取当前版本，注入到文档站（首页徽章 / 页脚）
const uikitPkg = JSON.parse(
  readFileSync(new URL('../../packages/uikit-im/package.json', import.meta.url), 'utf-8'),
)
// uikit-core 版本：core 源码经 alias 直连，构建期版本宏需在此注入
const uikitCorePkg = JSON.parse(
  readFileSync(new URL('../../packages/uikit-core/package.json', import.meta.url), 'utf-8'),
)
// uikit-chatroom 版本：包尚未落地时为 ''（聊天室首页徽章仅显示产品名），落地后自动注入
const chatroomPkgPath = new URL('../../packages/uikit-chatroom/package.json', import.meta.url)
const uikitChatroomVersion = existsSync(chatroomPkgPath)
  ? JSON.parse(readFileSync(chatroomPkgPath, 'utf-8')).version
  : ''

// SDK 版本：向上查找 easemob-websdk 的 package.json（兼容旧版 dist 入口与新版根目录入口）
function getSdkVersion(): string {
  const _require = createRequire(import.meta.url)
  let dir = dirname(_require.resolve('easemob-websdk'))
  while (dir !== dirname(dir)) {
    const sdkPackagePath = resolve(dir, 'package.json')
    if (existsSync(sdkPackagePath)) {
      const sdkPackage = JSON.parse(readFileSync(sdkPackagePath, 'utf-8')) as { name?: string, version?: string }
      if (sdkPackage.name === 'easemob-websdk')
        return sdkPackage.version ?? 'unknown'
    }
    dir = dirname(dir)
  }
  return 'unknown'
}

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
      '@easemob/uikit-core': fileURLToPath(new URL('../../packages/uikit-core/src', import.meta.url)),
      '@easemob/uikit-im': fileURLToPath(new URL('../../packages/uikit-im/src', import.meta.url)),
      // 聊天室包落地后，其组件 demo 可直接 import '@easemob/uikit-chatroom' 直连源码
      '@easemob/uikit-chatroom': fileURLToPath(new URL('../../packages/uikit-chatroom/src', import.meta.url)),
    },
  },
  define: {
    // 两类键缺一不可：
    // 1) 裸宏（__EASEMOB_*__）：dev 下由 @vite/env 注入 globalThis、build 由 vite:define 静态替换。
    //    三包源码经 alias 直连（docs demo 挂载 Provider 时包内会求值 clientVersion 宏），
    //    demo 应用同款约定，勿删。
    // 2) import.meta.env.* 自定义键：站点主题侧（Layout.vue 版本徽章）专用。裸宏在「dev server
    //    配置过期（define 映射缺键）而文件已 HMR」时会导致 ReferenceError 白屏；import.meta.env
    //    缺键只返回 undefined，可优雅降级，故主题侧一律走此通道。
    __EASEMOB_SDK_VERSION__: JSON.stringify(getSdkVersion()),
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitPkg.version),
    __EASEMOB_UIKIT_CORE_VERSION__: JSON.stringify(uikitCorePkg.version),
    __EASEMOB_UIKIT_CHATROOM_VERSION__: JSON.stringify(uikitChatroomVersion),
    'import.meta.env.EASEMOB_UIKIT_VERSION': JSON.stringify(uikitPkg.version),
    'import.meta.env.EASEMOB_UIKIT_CORE_VERSION': JSON.stringify(uikitCorePkg.version),
    'import.meta.env.EASEMOB_UIKIT_CHATROOM_VERSION': JSON.stringify(uikitChatroomVersion),
  },
})
