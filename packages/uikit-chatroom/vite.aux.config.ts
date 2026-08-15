import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * 辅助入口构建配置：为按需引入工具单独打包。
 * - @easemob/uikit-chatroom/resolver     -> EasemobUIKitChatroomResolver（unplugin-vue-components）
 * - @easemob/uikit-chatroom/auto-imports -> EasemobUIKitChatroomImports（unplugin-auto-import）
 *
 * 主构建（vite.config.ts）已输出完整组件库，这里只补充两个轻量子包，
 * 避免把它们合并进全量 bundle 导致 tree-shaking 不友好。
 */
export default defineConfig({
  plugins: [
    dts({
      // 仅生成对应 entry 的 .d.ts，不生成 index.d.ts
      insertTypesEntry: false,
      outDir: 'dist',
      exclude: ['*.config.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        resolver: resolve(__dirname, 'src/resolver.ts'),
        'auto-imports': resolve(__dirname, 'src/auto-imports.ts'),
      },
      formats: ['es'],
      fileName: (_format: string, entryName: string) => `${entryName}.js`,
    },
    rollupOptions: {
      // 两个文件都是纯工具函数，无外置依赖需要 external
      external: [],
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
