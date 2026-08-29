/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

function getAdapterVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
  return pkg.version ?? 'unknown'
}

const adapterVersion = getAdapterVersion()

export default defineConfig({
  define: {
    __EASEMOB_UIKIT_SDK_WEBIM4_VERSION__: JSON.stringify(adapterVersion),
  },
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
      name: 'EasemobUIKitSdkWebim4',
      formats: ['es', 'umd'],
      fileName: (format: string) => `easemob-uikit-sdk-webim4.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'easemob-websdk', '@easemob/uikit-sdk-contract'],
      output: {
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          // 4.x SDK 原生全局名为 window.WebIM（entry.ts 硬编码），与 5.x 的 Easemob 天然不冲突
          'easemob-websdk': 'WebIM',
          '@easemob/uikit-sdk-contract': 'EasemobUIKitSdkContract',
        },
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
