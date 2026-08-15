/**
 * ⚠️ 本文件由 packages/uikit-core/scripts/gen-aux-entries.mjs 参数化生成，勿手改。
 * 配置见包根 aux-entries.config.mjs；composables 导出变更后执行 pnpm -F @easemob/uikit-im aux:gen 重新生成，
 * build 前置 --check 会校验漂移。
 */

/**
 * unplugin-auto-import 的「业务主 hook」白名单（@easemob/uikit-im 包自动导入）。
 *
 * 约定：仅登记**面向业务集成的完整能力 hook**；内部实现细节（存储抽象 /
 * provider 装配 / 内部状态工具等）不自动导入，业务侧按需显式 import。
 */
export const EasemobUIKitImports = {
  '@easemob/uikit-im': [
    'useArrowNavigation',
    'useBlocklist',
    'useBottomSheet',
    'useChat',
    'useChatPlugin',
    'useClient',
    'useContact',
    'useContactFilter',
    'useContactGroup',
    'useContactSort',
    'useConversation',
    'useConversationTabs',
    'useEscToClose',
    'useGroup',
    'useGroupFilter',
    'useGroupSort',
    'useH5Adaptation',
    'useKeyBindings',
    'useKeyboard',
    'useLocale',
    'useLongPress',
    'useMessage',
    'useMessageActions',
    'useMessageHistory',
    'useMessageSend',
    'useNotification',
    'useOwnUserInfo',
    'usePresence',
    'usePullRefresh',
    'useResizable',
    'useTheme',
    'useToast',
    'useUIKit',
    'useUserInfo',
    'useViewport',
  ],
}
