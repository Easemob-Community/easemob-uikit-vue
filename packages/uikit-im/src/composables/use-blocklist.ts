import { computed } from 'vue'
import type { UiContact as Contact } from '@easemob/uikit-core'
import { createLogger, formatSdkError } from '@easemob/uikit-core'
import { useUIKit } from './use-uikit'

const logger = createLogger('UIKit:UseBlocklist')

/**
 * 黑名单能力集成
 * - 读走 context.stores.contact.blackList
 * - 写走 domains.contact（dataSource 接管已收口为 repository 注入；需 Provider.enableBlocklist=true）
 */
export function useBlocklist() {
  const { domains, features, stores } = useUIKit()
  const contactStore = stores.contact

  const blockList = computed(() => contactStore.blackList)

  function isBlocked(userId: string): boolean {
    return contactStore.isBlocked(userId)
  }

  /** \u624b\u52a8\u5237\u65b0\u9ed1\u540d\u5355 */
  async function refresh() {
    if (!features.enableBlocklist)
      return
    try {
      // dataSource.fetchBlocklist 已经 core 翻译为 contact.fetchBlocklist 注入，由 Domain 委托
      const list = await domains.contact.syncBlocklist()
      contactStore.setBlackList(list)
    }
    catch (error) {
      logger.warn('[useBlocklist] refresh failed:', formatSdkError(error))
      throw error
    }
  }

  /** \u5c06\u67d0\u4eba\u52a0\u9ed1 */
  async function addBlock(contact: Contact) {
    try {
      await domains.contact.addToBlocklist([contact.userId])
      contactStore.addToBlackList(contact)
    }
    catch (error) {
      logger.warn('[useBlocklist] addBlock failed:', formatSdkError(error))
      throw error
    }
  }

  /** \u53d6\u6d88\u62c9\u9ed1 */
  async function removeBlock(userId: string) {
    try {
      await domains.contact.removeFromBlocklist([userId])
      contactStore.removeFromBlackList(userId)
    }
    catch (error) {
      logger.warn('[useBlocklist] removeBlock failed:', formatSdkError(error))
      throw error
    }
  }

  return {
    blockList,
    isBlocked,
    refresh,
    addBlock,
    removeBlock,
  }
}
