import type { UserInfoAttributeValue, UserInfoRepository } from '@easemob-community/uikit-sdk-contract'
import type { UserInfoDomain } from '../../domain/user-info-domain'

export function createUserInfoRepository(domain: UserInfoDomain): UserInfoRepository {
  return {
    fetchUserInfos: async (userIds, attributes) => {
      return domain.fetchUserInfos(userIds, attributes)
    },
    updateOwnInfo: async (input) => {
      await domain.updateOwnInfo(input)
    },
    updateOwnInfoByAttribute: async (attribute, value) => {
      await domain.updateOwnInfoByAttribute(attribute, value as UserInfoAttributeValue)
    },
    subscribeUserInfos: async (userIds) => {
      await domain.subscribeUserInfos(userIds)
    },
    unsubscribeUsersInfo: async (userIds) => {
      await domain.unsubscribeUsersInfo(userIds)
    },
    getSubscribedUsers: async () => {
      // 4.x 无用户资料订阅能力，恒返回空
      return []
    },
  }
}
