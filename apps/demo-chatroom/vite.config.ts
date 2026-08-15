/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

function getPackageVersion(pkgName: string, relativePath: string): string {
  const pkgPath = resolve(__dirname, relativePath)
  if (!existsSync(pkgPath))
    return 'unknown'
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }
  return pkg.version ?? 'unknown'
}

const coreVersion = getPackageVersion('core', '../../packages/uikit-core/package.json')
const chatroomVersion = getPackageVersion('chatroom', '../../packages/uikit-chatroom/package.json')

export default defineConfig({
  define: {
    __EASEMOB_UIKIT_CORE_VERSION__: JSON.stringify(coreVersion),
    __EASEMOB_UIKIT_CHATROOM_VERSION__: JSON.stringify(chatroomVersion),
  },
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
    // 源码直连模式：theme 子路径必须排在主 alias 之前
    alias: [
      { find: '@easemob/uikit-core/theme', replacement: resolve(__dirname, '../../packages/uikit-core/src/theme/index.css') },
      { find: '@easemob/uikit-core', replacement: resolve(__dirname, '../../packages/uikit-core/src') },
      { find: '@easemob/uikit-chatroom', replacement: resolve(__dirname, '../../packages/uikit-chatroom/src') },
    ],
  },
})
