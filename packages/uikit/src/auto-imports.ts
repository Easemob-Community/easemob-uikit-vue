/**
 * unplugin-auto-import 的「业务主 hook」白名单（@easemob/uikit 包自动导入）。
 *
 * 约定：仅登记**面向业务集成的完整能力 hook**；内部实现细节（useRipple /
 * useQuote / usePinyin / useUIKitStorage 等工具与状态管理函数）不自动导入，
 * 业务侧按需显式 import。
 *
 * ⚠️ 新增业务 hook 后必须同步登记，校验脚本：
 *   pnpm -F @easemob/uikit auto-imports:check（build 前置已挂载）
 * 脚本从 composables/index.ts 派生导出并剔除排除名单，与本白名单比对，
 * 缺漏/多余均报错，杜绝漂移。
 */
export const EasemobUIKitImports = {
  '@easemob/uikit': [
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
