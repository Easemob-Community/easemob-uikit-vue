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
        exclude: ['*.config.ts', 'src/histoire-setup.ts', 'src/shims-vue.d.ts'],
        // 手写 .d.ts（如 src/theme/index.d.ts）一并拷贝进 dist：主题子路径需要类型声明
        // （见 package.json exports ./theme 的 types 条件）；shims-vue.d.ts 属源码侧
        // 环境声明，对消费者无意义且可能与其自身 *.vue shim 合并冲突，故排除。
        copyDtsFiles: true,
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
      // theme @import 必须内联 **core 的 dist 产物**（而非 core src 的变量表）。
      // core 是外置依赖，其原子组件（Avatar/Icon/Popup/IconButton…）的 scoped 样式
      // 只在 core 的 dist/theme/index.css 里；若指向 core src（仅 :root 变量表），
      // 则 @easemob/uikit-im/theme 产物只含变量、缺 core 组件样式，外部消费者
      // 只 import '@easemob/uikit-im/theme' 时 core 组件（头像/右键菜单等）会全部失去样式。
      // 注意：这要求 core 先构建（core 为 im 的 workspace:^ 依赖，pnpm -r build 已自动排序）。
      '@easemob/uikit-core/theme': resolve(__dirname, '../uikit-core/dist/theme/index.css'),
      '@': resolve(__dirname, 'src'),
    },
  },
})
