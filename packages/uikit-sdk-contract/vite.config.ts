/// <reference types="node" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * 契约包构建：纯 TS（类型 + 类型守卫 + 常量），零运行时依赖、零 vue/pinia/SDK。
 * 产物只含中立类型声明与少量类型守卫函数；主入口作为 uikit-im / adapter / core 的共同依赖。
 */
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      exclude: ['*.config.ts'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EasemobUIKitSdkContract',
      formats: ['es', 'umd'],
      fileName: (format: string) => `easemob-uikit-sdk-contract.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      // 契约包零依赖：不 external 任何第三方，中立类型/守卫全部内联进产物
      external: [],
      output: {
        exports: 'named',
        globals: {},
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
