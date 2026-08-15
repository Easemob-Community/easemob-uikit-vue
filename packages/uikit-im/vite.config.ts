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

function getUIKitVersion(): string {
  const uikitPackage = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
  return uikitPackage.version ?? 'unknown'
}

const sdkVersion = getSdkVersion()
const uikitVersion = getUIKitVersion()

// histoire（story:dev/story:build）会合并本配置；其虚拟入口 bundle-main/bundle-sandbox
// 若经 dts 插件处理会在 dist 残留 bundle-*.d.ts，故 histoire 运行时不挂 dts。
const isHistoire = process.argv.some(arg => arg.includes('histoire'))

export default defineConfig({
  define: {
    __EASEMOB_SDK_VERSION__: JSON.stringify(sdkVersion),
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitVersion),
  },
  plugins: [
    vue(),
    ...(!isHistoire
      ? [dts({
        insertTypesEntry: true,
        outDir: 'dist',
        exclude: ['*.config.ts', 'src/histoire-setup.ts'],
        // tsconfig paths 把 @easemob/uikit-core 映射到 core src，不做排除时
        // d.ts 会把 re-export core 符号的模块说明符展开成 ../../uikit-core/src 相对路径，
        // 发布给消费者后该路径不存在导致类型断裂；保持裸包名，类型经 core dist 的 d.ts 解析。
        aliasesExclude: ['@easemob/uikit-core'],
      })]
      : []),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EasemobUIKit',
      formats: ['es', 'umd'],
      fileName: (format: string) => `easemob-uikit-im.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'easemob-websdk', '@easemob/uikit-core'],
      output: {
        // 同时存在命名导出与 default 导出时，显式声明使用命名导出策略，
        // 避免 Rollup 警告 "Consumers will have to use `EasemobUIKit.default`"。
        // 由于 install 也是命名导出，UMD 用户可直接 `app.use(EasemobUIKit)`。
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          'easemob-websdk': 'Easemob',
          // core 的 UMD 全局名（core vite.config lib.name = 'EasemobUIKitCore'），
          // 不声明时 rollup 会猜成 'uikitCore'，CDN 直引两个 UMD 产物会断链
          '@easemob/uikit-core': 'EasemobUIKitCore',
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
      // theme @import 直指 core 源文件，uikit-im 构建不依赖 core dist 先产出
      '@easemob/uikit-core/theme': resolve(__dirname, '../uikit-core/src/theme/index.css'),
      '@': resolve(__dirname, 'src'),
    },
  },
})
