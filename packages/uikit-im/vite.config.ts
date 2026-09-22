/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

function getUIKitVersion(): string {
  const uikitPackage = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
  return uikitPackage.version ?? 'unknown'
}

const uikitVersion = getUIKitVersion()

// histoire（story:dev/story:build）会合并本配置；其虚拟入口 bundle-main/bundle-sandbox
// 若经 dts 插件处理会在 dist 残留 bundle-*.d.ts，故 histoire 运行时不挂 dts。
const isHistoire = process.argv.some(arg => arg.includes('histoire'))

export default defineConfig({
  define: {
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitVersion),
  },
  plugins: [
    // componentIdGenerator: 'filepath' —— scoped data-v hash 仅由文件路径决定，与源码内容无关。
    // plugin-vue 4.x 生产构建的 hash = hash(路径 + 源码)，任何 SFC 改动都会改变 scopeId，
    // 而本包 theme 内联的是 core dist 的 scoped 样式（hash 固化在 core 构建期）；
    // core 后续单独重构建（改了任意 SFC）会使本包 theme 里的 data-v 选择器失配、组件失去样式。
    // 必须保持 filepath 模式（core/im 两侧一致），否则跨包主题内联会再次断裂。
    vue({ features: { componentIdGenerator: 'filepath' } }),
    ...(!isHistoire
      ? [dts({
        insertTypesEntry: true,
        outDir: 'dist',
        exclude: ['*.config.ts', 'src/histoire-setup.ts', 'src/shims-vue.d.ts'],
        // 手写 .d.ts（如 src/theme/index.d.ts）一并拷贝进 dist：主题子路径需要类型声明
        // （见 package.json exports ./theme 的 types 条件）；shims-vue.d.ts 属源码侧
        // 环境声明，对消费者无意义且可能与其自身 *.vue shim 合并冲突，故排除。
        copyDtsFiles: true,
        // tsconfig paths 把 @easemob-community/uikit-core 等映射到各包 src，不做排除时
        // d.ts 会把 re-export 符号的模块说明符展开成 ../../xxx/src 相对路径，
        // 发布给消费者后该路径不存在导致类型断裂；保持裸包名，类型经各自 dist 的 d.ts 解析。
        aliasesExclude: [
          '@easemob-community/uikit-core',
          '@easemob-community/uikit-sdk-contract',
          '@easemob-community/uikit-sdk-websdk5',
        ],
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
      external: [
        'vue',
        'pinia',
        '@easemob-community/uikit-core',
        '@easemob-community/uikit-sdk-contract',
        '@easemob-community/uikit-sdk-websdk5',
      ],
      output: {
        // 同时存在命名导出与 default 导出时，显式声明使用命名导出策略，
        // 避免 Rollup 警告 "Consumers will have to use `EasemobUIKit.default`"。
        // 由于 install 也是命名导出，UMD 用户可直接 `app.use(EasemobUIKit)`。
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          // core / 契约 / adapter 的 UMD 全局名，CDN 直引多个 UMD 产物时按此断链
          '@easemob-community/uikit-core': 'EasemobUIKitCore',
          '@easemob-community/uikit-sdk-contract': 'EasemobUIKitSdkContract',
          '@easemob-community/uikit-sdk-websdk5': 'EasemobUIKitSdkWebsdk5',
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
      // theme @import 必须内联 **core 的 dist 产物**（而非 core src 的变量表）。
      // core 是外置依赖，其原子组件（Avatar/Icon/Popup/IconButton…）的 scoped 样式
      // 只在 core 的 dist/theme/index.css 里；若指向 core src（仅 :root 变量表），
      // 则 @easemob-community/uikit-im/theme 产物只含变量、缺 core 组件样式，外部消费者
      // 只 import '@easemob-community/uikit-im/theme' 时 core 组件（头像/右键菜单等）会全部失去样式。
      // 注意：这要求 core 先构建（core 为 im 的 workspace:^ 依赖，pnpm -r build 已自动排序）。
      '@easemob-community/uikit-core/theme': resolve(__dirname, '../uikit-core/dist/theme/index.css'),
      '@': resolve(__dirname, 'src'),
    },
  },
})
