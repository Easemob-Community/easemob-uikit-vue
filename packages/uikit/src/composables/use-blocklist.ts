import { computed } from 'vue'
import type { UserInfo } from 'easemob-websdk'
import type { UiContact as Contact } from '../sdk/types'
import { useUIKit } from './use-uikit'

/**
 * 黑名单能力集成
 * - 读走 context.stores.contact.blackList
 * - 写走 client + dataSource（需 Provider.enableBlocklist=true）
 */
export function useBlocklist() {
  const { client, dataSource, features, stores } = useUIKit()
  const contactStore = stores.contact

  const blockList = computed(() => contactStore.blackList)

  function isBlocked(userId: string): boolean {
    return contactStore.isBlocked(userId)
  }

  /** \u624b\u52a8\u5237\u65b0\u9ed1\u540d\u5355 */
  async function refresh() {
    if (!features.enableBlocklist)
      return
    if (dataSource.fetchBlocklist) {
      const list = await dataSource.fetchBlocklist()
      contactStore.setBlackList(list)
      return
    }
    if (!client.value)
      return
    const userInfos: ReadonlyArray<UserInfo> = await client.value.contactManager.getBlocklist()
    contactStore.setBlackList(userInfos.map((info: UserInfo) => ({
      userId: info.userId,
      name: info.nickname || info.userId,
      avatar: info.avatarUrl,
    })))
  }

  /** \u5c06\u67d0\u4eba\u52a0\u9ed1 */
  async function addBlock(contact: Contact) {
    if (!client.value)
      return
    await client.value.contactManager.addUsersToBlocklist({ userIds: [contact.userId] })
    contactStore.addToBlackList(contact)
  }

  /** \u53d6\u6d88\u62c9\u9ed1 */
  async function removeBlock(userId: string) {
    if (!client.value)
      return
    await client.value.contactManager.removeUserFromBlocklist({ userIds: [userId] })
    contactStore.removeFromBlackList(userId)
  }

  return {
    blockList,
    isBlocked,
    refresh,
    addBlock,
    removeBlock,
  }
}
