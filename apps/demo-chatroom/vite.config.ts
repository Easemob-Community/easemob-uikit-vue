/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

function getSdkVersion(): string {
  const _require = createRequire(import.meta.url)
  let dir = dirname(_require.resolve('easemob-websdk'))
  // 向上查找 easemob-websdk 的 package.json（兼容旧版 dist 入口与新版根目录入口）
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

function getPackageVersion(relativePath: string): string {
  const pkgPath = resolve(__dirname, relativePath)
  if (!existsSync(pkgPath))
    return 'unknown'
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }
  return pkg.version ?? 'unknown'
}

const sdkVersion = getSdkVersion()
const coreVersion = getPackageVersion('../../packages/uikit-core/package.json')
const chatroomVersion = getPackageVersion('../../packages/uikit-chatroom/package.json')

export default defineConfig({
  define: {
    // core sdk 基座（client.ts）与 chatroom Provider 均引用版本宏，必须全部定义
    __EASEMOB_SDK_VERSION__: JSON.stringify(sdkVersion),
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
