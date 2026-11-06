import type { PresenceRepository } from '@easemob-community/uikit-sdk-contract'
import type { PresenceDomain } from '../../domain/presence-domain'

export function createPresenceRepository(domain: PresenceDomain): PresenceRepository {
  const presenceDomain = domain
  return {
    subscribe: async (userIds, expiry) => {
      await presenceDomain.subscribe(userIds, expiry)
    },

    unsubscribe: async (userIds) => {
      await presenceDomain.unsubscribe(userIds)
    },

    fetchStatus: async (userIds) => {
      return presenceDomain.fetchStatus(userIds)
    },

    publish: async (description) => {
      await presenceDomain.publish(description)
    },
  }
}
