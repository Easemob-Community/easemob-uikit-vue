/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

function getSdkVersion(): string {
  const _require = createRequire(import.meta.url)
  let dir = dirname(_require.resolve('easemob-websdk'))
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

function getAdapterVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version?: string }
  return pkg.version ?? 'unknown'
}

const sdkVersion = getSdkVersion()
const adapterVersion = getAdapterVersion()

export default defineConfig({
  define: {
    __EASEMOB_SDK_VERSION__: JSON.stringify(sdkVersion),
    __EASEMOB_UIKIT_SDK_WEBSDK5_VERSION__: JSON.stringify(adapterVersion),
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
      name: 'EasemobUIKitSdkWebsdk5',
      formats: ['es', 'umd'],
      fileName: (format: string) => `easemob-uikit-sdk-websdk5.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'easemob-websdk', '@easemob/uikit-core', '@easemob/uikit-sdk-contract'],
      output: {
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          'easemob-websdk': 'Easemob',
          '@easemob/uikit-core': 'EasemobUIKitCore',
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
