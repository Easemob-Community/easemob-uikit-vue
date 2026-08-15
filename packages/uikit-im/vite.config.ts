/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

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

function getUIKitVersion(): string {
  const uikitPackage = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
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
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      exclude: ['*.config.ts', 'src/histoire-setup.ts'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EasemobUIKit',
      formats: ['es', 'umd'],
      fileName: (format: string) => `easemob-uikit-im.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'easemob-websdk'],
      output: {
        // 同时存在命名导出与 default 导出时，显式声明使用命名导出策略，
        // 避免 Rollup 警告 "Consumers will have to use `EasemobUIKit.default`"。
        // 由于 install 也是命名导出，UMD 用户可直接 `app.use(EasemobUIKit)`。
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          'easemob-websdk': 'Easemob',
        },
        assetFileNames: (assetInfo: { name?: string }) => {
          if (assetInfo.name === 'style.css')
            return 'theme/index.css'
          return assetInfo.name || 'assets/[name][extname]'
        },
      },
    },
    outDir: 'dist',
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
