/**
 * aux 入口（resolver / auto-imports）生成配置，由
 * scripts/gen-aux-entries.mjs 消费（core 自身也是该脚本的第一个复用方，
 * chatroom 等后续场景包按同一模式配置即可）。
 */
export default {
  pkgName: '@easemob/uikit-core',
  resolverName: 'EasemobUIKitCoreResolver',
  importsName: 'EasemobUIKitCoreImports',
  prefix: 'Em',
  // resolver 注释示例组件名（core 侧真实导出的容器组件）
  exampleComponent: 'EmUIKitProvider',
  scan: ['src/composables'],
  include: [
    // locale 模块的 useLocale（composables 之外的合法登记）
    'useLocale',
  ],
  exclude: [
    // use-ripple：内部涟漪效果
    'useRipple',
    // use-uikit-storage：存储抽象（内部链路）
    'createUIKitStorageKey',
    'getStorageBackend',
    'useUIKitStorage',
    // use-key-bindings 附属：快捷键开关内部函数
    'setKeyboardShortcutsEnabled',
    'isKeyboardShortcutsEnabled',
    // use-uikit 附属：context 注入 key 与 provider 内部装配函数
    'CORE_UIKIT_CONTEXT_KEY',
    'useCoreUIKitProvider',
    // use-provider-side-effects：Provider 装配内部函数
    'useProviderSideEffects',
    'createUserInfoSubscriptionErrorHandler',
    // use-notification 附属：送达回调触发（notification-engine 内部调用）
    'emitNotificationDelivered',
  ],
}
