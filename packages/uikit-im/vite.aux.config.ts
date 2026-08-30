import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * 辅助入口构建配置：为按需引入工具单独打包。
 * - @easemob/uikit-im/resolver     -> EasemobUIKitResolver（unplugin-vue-components）
 * - @easemob/uikit-im/auto-imports -> EasemobUIKitImports（unplugin-auto-import）
 * - @easemob/uikit-im/websdk5      -> SDK5 默认适配器注册入口（D122 决策 22 子路径入口，
 *   import 即注册默认 adapter；主入口保持零 adapter 静态引用以保 4.x 下游摇树隔离）
 *
 * 主构建（vite.config.ts）已输出完整组件库，这里只补充轻量子包，
 * 避免把它们合并进全量 bundle 导致 tree-shaking 不友好。
 */
export default defineConfig({
  plugins: [
    dts({
      // 仅生成对应 entry 的 .d.ts，不生成 index.d.ts
      insertTypesEntry: false,
      outDir: 'dist',
      exclude: ['*.config.ts', 'src/histoire-setup.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        resolver: resolve(__dirname, 'src/resolver.ts'),
        'auto-imports': resolve(__dirname, 'src/auto-imports.ts'),
        websdk5: resolve(__dirname, 'src/websdk5.ts'),
      },
      formats: ['es'],
      fileName: (_format: string, entryName: string) => `${entryName}.js`,
    },
    rollupOptions: {
      // resolver/auto-imports 是纯工具函数；websdk5 入口仅做注册转发，
      // adapter 与 core 均为外置依赖（optional peer / workspace dep），不打进本产物
      external: ['@easemob/uikit-sdk-websdk5', '@easemob/uikit-core'],
    },
    outDir: 'dist',
    // 必须保留主构建产物，不能清空 dist
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
