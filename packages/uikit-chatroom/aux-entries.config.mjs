/**
 * aux 入口（resolver / auto-imports）生成配置，由
 * packages/uikit-core/scripts/gen-aux-entries.mjs 消费（与 core / uikit-im 同一参数化模式）。
 * 白名单 = composables 桶文件派生的运行时导出 - exclude（内部实现细节） + include。
 */
export default {
  pkgName: '@easemob/uikit-chatroom',
  resolverName: 'EasemobUIKitChatroomResolver',
  importsName: 'EasemobUIKitChatroomImports',
  prefix: 'Em',
  // resolver 注释示例组件名（P2-2 落地的容器组件）
  exampleComponent: 'EmChatroomContainer',
  scan: ['src/composables/index.ts'],
  exclude: [
    // use-chatroom-provider：Provider 装配内部函数与常量（P2-2 容器组件内组合使用）
    'useChatroomProvider',
    'resolveChatroomClientConfig',
    'CHATROOM_SDK_MANAGERS',
    // use-chatroom-scene 附属：scene preset 注册表与解析（容器/业务侧显式 import）
    'registerChatroomScene',
    'resolveChatroomScene',
  ],
}
