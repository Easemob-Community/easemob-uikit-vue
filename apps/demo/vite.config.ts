/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

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
  const uikitPackagePath = resolve(__dirname, '../../packages/uikit-im/package.json')
  const uikitPackage = JSON.parse(readFileSync(uikitPackagePath, 'utf-8')) as { version?: string }
  return uikitPackage.version ?? 'unknown'
}

function getUIKitCoreVersion(): string {
  const corePackagePath = resolve(__dirname, '../../packages/uikit-core/package.json')
  const corePackage = JSON.parse(readFileSync(corePackagePath, 'utf-8')) as { version?: string }
  return corePackage.version ?? 'unknown'
}

function getUIKitChatroomVersion(): string {
  const chatroomPackagePath = resolve(__dirname, '../../packages/uikit-chatroom/package.json')
  const chatroomPackage = JSON.parse(readFileSync(chatroomPackagePath, 'utf-8')) as { version?: string }
  return chatroomPackage.version ?? 'unknown'
}

function getUIKitSdkWebsdk5Version(): string {
  const pkgPath = resolve(__dirname, '../../packages/uikit-sdk-websdk5/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }
  return pkg.version ?? 'unknown'
}

const sdkVersion = getSdkVersion()
const uikitVersion = getUIKitVersion()
const uikitCoreVersion = getUIKitCoreVersion()
const uikitChatroomVersion = getUIKitChatroomVersion()
const uikitSdkWebsdk5Version = getUIKitSdkWebsdk5Version()

export default defineConfig({
  define: {
    __EASEMOB_SDK_VERSION__: JSON.stringify(sdkVersion),
    __EASEMOB_UIKIT_VERSION__: JSON.stringify(uikitVersion),
    __EASEMOB_UIKIT_CORE_VERSION__: JSON.stringify(uikitCoreVersion),
    __EASEMOB_UIKIT_CHATROOM_VERSION__: JSON.stringify(uikitChatroomVersion),
    // websdk5 适配器源码直连时，adapter client.ts 的版本日志宏需在此定义
    __EASEMOB_UIKIT_SDK_WEBSDK5_VERSION__: JSON.stringify(uikitSdkWebsdk5Version),
  },
  plugins: [
    // 双 SDK 共存钉版：webim4 adapter 源码内的 easemob-websdk 一律重定向到 easemob-websdk-4（npm alias，4.24.2）
    // 原因：vite 预构建对裸说明符按「名字」注册唯一产物，websdk5 adapter 先注册 easemob-websdk(5.x) 后，
    // webim4 的同名 import 会被 tryOptimizedResolve 直接劫持到 5.x 产物（不经 node 向上查找）；
    // 换成独立 specifier 后两份 SDK 各自预构建、互不干扰。类型层不受影响（tsc 仍按 webim4 自身 node_modules 解析 4.24.2 类型）
    {
      name: 'demo-pin-webim4-sdk',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === 'easemob-websdk' && importer && importer.includes('/packages/uikit-sdk-webim4/'))
          return this.resolve('easemob-websdk-4', importer, { skipSelf: true })
        return null
      },
    },
    vue(),
    Components({
      dts: true,
    }),
    AutoImport({
      imports: ['vue'],
      dts: true,
    }),
  ],
  optimizeDeps: {
    // 确保 4.24.2 副本被预构建（扫描器不一定追踪插件重定向后的 specifier）
    include: ['easemob-websdk-4'],
  },
  resolve: {
    // 源码直连模式：theme 子路径必须排在 @easemob/uikit-im 主 alias 之前
    // （临时 tgz 产物联调验证时注释掉以下两条 alias，并同步切换 package.json 依赖）
    alias: [
      // core 主 alias 已指 src，theme 子路径同步指 src（改 CSS 变量无需先构建 core dist）
      { find: '@easemob/uikit-core/theme', replacement: resolve(__dirname, '../../packages/uikit-core/src/theme/index.css') },
      { find: '@easemob/uikit-core', replacement: resolve(__dirname, '../../packages/uikit-core/src') },
      // SDK 中立契约包 + 双 adapter 源码直连（D122 双 adapter 拆包）
      // webim4 的 easemob-websdk 运行时经上方 demo-pin-webim4-sdk 插件钉到 easemob-websdk-4(4.24.2)，与 5.x 互不干扰
      { find: '@easemob/uikit-sdk-contract', replacement: resolve(__dirname, '../../packages/uikit-sdk-contract/src') },
      { find: '@easemob/uikit-sdk-websdk5', replacement: resolve(__dirname, '../../packages/uikit-sdk-websdk5/src') },
      { find: '@easemob/uikit-sdk-webim4', replacement: resolve(__dirname, '../../packages/uikit-sdk-webim4/src') },
      { find: '@easemob/uikit-im/theme', replacement: resolve(__dirname, '../../packages/uikit-im/dist/theme/index.css') },
      { find: '@easemob/uikit-im', replacement: resolve(__dirname, '../../packages/uikit-im/src') },
      // chatroom 场景包源码直连（P2-2 demo 页使用；chatroom 无独立主题，theme 子路径经 exports 指 core）
      { find: '@easemob/uikit-chatroom', replacement: resolve(__dirname, '../../packages/uikit-chatroom/src') },
    ],
  },
})
