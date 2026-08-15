/**
 * aux 入口（resolver / auto-imports）生成配置，由
 * packages/uikit-core/scripts/gen-aux-entries.mjs 消费。
 * 白名单 = composables 桶文件派生的运行时导出（含具名 re-export 的 core 符号）
 *          - exclude（内部实现细节） + include（composables 之外的合法登记）。
 */
export default {
  pkgName: '@easemob/uikit-im',
  resolverName: 'EasemobUIKitResolver',
  importsName: 'EasemobUIKitImports',
  prefix: 'Em',
  scan: ['src/composables/index.ts'],
  include: [
    // locale 模块的 useLocale（composables 之外的合法登记）
    'useLocale',
  ],
  exclude: [
    // use-pinyin：拼音 adapter 工具（demo 侧使用）
    'setPinyinAdapter',
    'hasPinyinAdapter',
    'resolvePinyin',
    'clearPinyinCache',
    'usePinyin',
    // use-ripple：内部涟漪效果
    'useRipple',
    // use-quote：内部引用消息状态
    'getQuotePreview',
    'buildQuoteExt',
    'useQuote',
    // use-uikit-storage：存储抽象（草稿持久化等内部链路）
    'createUIKitStorageKey',
    'getStorageBackend',
    'useUIKitStorage',
    // use-message-actions 附属：内部状态/错误解析
    'resetMultiSelectState',
    'resolveTranslateLang',
    'resolveVoiceToTextErrorMessage',
    // use-chat-plugin 附属：context provide 内部函数
    'provideChatPluginContext',
    'provideMessageInputPluginContext',
    // use-key-bindings 附属：快捷键开关内部函数
    'setKeyboardShortcutsEnabled',
    'isKeyboardShortcutsEnabled',
    // use-uikit 附属：context 注入 key 与 provider 内部装配函数
    'UIKIT_CONTEXT_KEY',
    'useUIKitProvider',
    // use-notification 附属：送达回调触发（notification-engine 内部调用，业务侧走 setNotificationHandler）
    'emitNotificationDelivered',
    // use-conversation 附属：草稿存储内部管理函数（provider 装配用）
    'clearAllDrafts',
    'initDraftStorage',
  ],
}
