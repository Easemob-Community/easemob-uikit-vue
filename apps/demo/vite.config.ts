/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

function getSdkVersion(): string {
  const _require = createRequire(import.meta.url)
  const sdkMainPath = _require.resolve('easemob-websdk')
  const sdkPackagePath = resolve(dirname(sdkMainPath), '../package.json')
  const sdkPackage = JSON.parse(readFileSync(sdkPackagePath, 'utf-8')) as { version?: string }
  return sdkPackage.version ?? 'unknown'
}

function getUIKitVersion(): string {
  const uikitPackagePath = resolve(__dirname, '../../packages/uikit/package.json')
  const uikitPackage = JSON.parse(readFileSync(uikitPackagePath, 'utf-8')) as { version?: string }
  return uikitPackage.version ?? 'unknown'
}

const sdkVersion = getSdkVersion()
const uikitVersion = getUIKitVersion()

export default defineConfig({
  define: {
    __EASEMOB_SDK_VERSION__: JSON.stringify(sdkVersion),
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitVersion),
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
    alias: {
      '@easemob/uikit': resolve(__dirname, '../../packages/uikit/src'),
    },
  },
})
