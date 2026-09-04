/// <reference types="node" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * 本地持久化包构建：纯 TS Node 库（不依赖 vue / pinia / electron）。
 * better-sqlite3 为 optional peer（external，运行时才解析宿主安装）；
 * 契约包同为 external（workspace 依赖，产物不内联）。
 */
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      exclude: ['*.config.ts', 'src/__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EasemobUIKitPersistSqlite',
      formats: ['es', 'cjs'],
      fileName: (format: string) => `easemob-uikit-persist-sqlite.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['better-sqlite3', '@easemob/uikit-sdk-contract', /^node:/],
      output: {
        exports: 'named',
      },
    },
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
