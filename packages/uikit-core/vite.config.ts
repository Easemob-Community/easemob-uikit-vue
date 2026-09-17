/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

function getCoreVersion(): string {
  const corePackage = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
  return corePackage.version ?? 'unknown'
}

const coreVersion = getCoreVersion()

// histoire（story:dev/story:build）会合并本配置；其虚拟入口 bundle-main/bundle-sandbox
// 若经 dts 插件处理会在 dist 残留 bundle-*.d.ts，故 histoire 运行时不挂 dts。
const isHistoire = process.argv.some(arg => arg.includes('histoire'))

export default defineConfig({
  define: {
    __EASEMOB_UIKIT_CORE_VERSION__: JSON.stringify(coreVersion),
  },
  plugins: [
    // componentIdGenerator: 'filepath' —— scoped data-v hash 仅由文件路径决定，与源码内容无关。
    // plugin-vue 4.x 生产构建的 hash = hash(路径 + 源码)，任何 SFC 改动都会改变 scopeId，
    // 而 uikit-im 的 theme 会内联本包 dist 的 scoped 样式（见 uikit-im vite.config 注释），
    // core 单独重构建就会导致 im theme 里的 data-v 选择器全部失配（组件失去样式）。
    // 必须保持 filepath 模式，否则跨包主题内联会再次断裂。
    vue({ features: { componentIdGenerator: 'filepath' } }),
    ...(!isHistoire
      ? [dts({
        insertTypesEntry: true,
        outDir: 'dist',
        exclude: ['*.config.ts', 'src/histoire-setup.ts'],
        // 手写 .d.ts（如 src/theme/index.d.ts）一并拷贝进 dist：主题子路径需要类型声明
        // （见 package.json exports ./theme 的 types 条件）。
        copyDtsFiles: true,
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
      external: [
        'vue',
        'pinia',
        '@easemob/uikit-sdk-contract',
        '@easemob/uikit-sdk-websdk5',
      ],
      output: {
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          '@easemob/uikit-sdk-contract': 'EasemobUIKitSdkContract',
          '@easemob/uikit-sdk-websdk5': 'EasemobUIKitSdkWebsdk5',
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
