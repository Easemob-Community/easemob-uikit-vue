/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
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

function getCoreVersion(): string {
  const corePackage = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
  return corePackage.version ?? 'unknown'
}

const sdkVersion = getSdkVersion()
const coreVersion = getCoreVersion()

// histoire（story:dev/story:build）会合并本配置；其虚拟入口 bundle-main/bundle-sandbox
// 若经 dts 插件处理会在 dist 残留 bundle-*.d.ts，故 histoire 运行时不挂 dts。
const isHistoire = process.argv.some(arg => arg.includes('histoire'))

export default defineConfig({
  define: {
    __EASEMOB_SDK_VERSION__: JSON.stringify(sdkVersion),
    __EASEMOB_UIKIT_CORE_VERSION__: JSON.stringify(coreVersion),
  },
  plugins: [
    vue(),
    ...(!isHistoire
      ? [dts({
        insertTypesEntry: true,
        outDir: 'dist',
        exclude: ['*.config.ts', 'src/histoire-setup.ts'],
      })]
      : []),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EasemobUIKitCore',
      formats: ['es', 'umd'],
      fileName: (format: string) => `easemob-uikit-core.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'easemob-websdk'],
      output: {
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
