/// <reference types="vite/client" />

// vite.config.ts 经 define 注入的自定义 import.meta.env 键（见 apps/docs/vite.config.ts）
// 站点主题侧（Layout.vue 版本徽章）一律走 import.meta.env 通道而非裸宏：
// dev 下裸宏靠 @vite/env 注入 globalThis 生效，一旦 dev server 配置过期（define 映射缺键）
// 而文件已 HMR，裸宏会 ReferenceError 白屏；import.meta.env 缺键只返回 undefined，可优雅降级。
interface ImportMetaEnv {
  readonly EASEMOB_UIKIT_VERSION: string
  readonly EASEMOB_UIKIT_CORE_VERSION: string
  readonly EASEMOB_UIKIT_CHATROOM_VERSION: string
}
