import { ref } from 'vue'
import type { Ref } from 'vue'
import { DEFAULT_CONVERSATION_TABS } from '../modules/conversation/types'
import type { ConversationTabKey } from '../modules/conversation/types'

export interface UseConversationTabsOptions {
  /**
   * 分栏 tab 集合，默认全量 ['all', 'unread', 'atMe', 'single', 'group']；
   * 顺序即渲染优先级；传空数组可隐藏 tab 栏。
   */
  tabs?: ConversationTabKey[]
  /** 初始激活的分栏 tab，默认 'all' */
  activeTab?: ConversationTabKey
}

export interface UseConversationTabsReturn {
  /** 分栏 tab 集合（可写，顺序即优先级，置空数组隐藏 tab 栏） */
  tabs: Ref<ConversationTabKey[]>
  /** 当前激活的分栏 tab */
  activeTab: Ref<ConversationTabKey>
  /** 切换分栏 tab */
  selectTab: (tab: ConversationTabKey) => void
  /** 判断 tab 是否激活 */
  isActive: (tab: ConversationTabKey) => boolean
}

/**
 * 会话分栏 tab 状态管理 hook。
 *
 * 与 <EmConversationContainer> / <EmConversationList> 配合使用：
 * - 半接管：把返回的 tabs / activeTab 绑定到组件 props，tab 栏渲染走内置样式
 * - 完全接管：同时传入 #tabs 插槽，基于 tabs / activeTab / selectTab 自绘 tab 栏
 *
 * 示例：
 * ```ts
 * const { tabs, activeTab, selectTab } = useConversationTabs({
 *   tabs: ['single', 'group'], // 业务只有单聊/群聊，不区分更多类型
 * })
 * ```
 */
export function useConversationTabs(options: UseConversationTabsOptions = {}): UseConversationTabsReturn {
  const tabs = ref<ConversationTabKey[]>(options.tabs ?? [...DEFAULT_CONVERSATION_TABS])
  const activeTab = ref<ConversationTabKey>(options.activeTab ?? 'all')

  /** 切换分栏 tab */
  function selectTab(tab: ConversationTabKey) {
    activeTab.value = tab
  }

  /** 判断 tab 是否激活 */
  function isActive(tab: ConversationTabKey) {
    return activeTab.value === tab
  }

  return { tabs, activeTab, selectTab, isActive }
}
