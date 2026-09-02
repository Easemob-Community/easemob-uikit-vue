import type {
  ContactRepository,
  GroupRepository,
  PresenceRepository,
  SdkRepositoryOverrides,
  UIKitDataSource,
  UserInfoRepository,
} from '@easemob/uikit-sdk-contract'

/**
 * dataSource → repository 薄别名翻译（D122 风险 10 收口）。
 *
 * 旧 `UIKitDataSource`（Provider dataSource prop）不再由 UI 层直接消费，
 * core 装配时逐项翻译为 `SdkRepositoryOverrides` 注入 adapter Domain：
 *
 * | dataSource            | repositories 覆盖项          | 说明 |
 * | --------------------- | ---------------------------- | ---- |
 * | fetchContacts         | contact.fetchContacts        | 参数对象 {cursor,pageSize} → 位置参数；hasMore 缺省补 false |
 * | fetchBlocklist        | contact.fetchBlocklist       | 直通 |
 * | addContact            | contact.addContact           | 直通（动作接管语义） |
 * | fetchGroups           | group.fetchGroups            | 参数对象 → 位置参数；hasMore 缺省补 false |
 * | createGroup           | group.createGroup            | 直通（动作接管语义） |
 * | fetchPresence         | presence.fetchStatus         | 直通 |
 * | subscribePresence     | presence.subscribe           | 丢弃 expiry（旧调用本就不传） |
 * | unsubscribePresence   | presence.unsubscribe         | 直通 |
 * | fetchUserInfos        | userInfo.fetchUserInfos      | 忽略 attributes；字段收敛由 Domain 兜底 |
 * | searchUsers           | ——（不翻译）                  | SDK 无搜索能力，repository 契约无对应项，仍由 UI 层单点消费 |
 *
 * 惰性求值：各覆盖项以 getter 挂接，每次被 Domain 读取时解析最新 dataSource
 * （与旧 ctx.dataSource 惰性 Proxy 的运行时切换语义一致）；dataSource 未定义
 * 对应方法时 getter 返回 undefined，Domain 判空后回落 SDK 默认路径。
 *
 * 优先级：显式传入的 `repositories`（SdkConfig / sdkConfig 注入）按域整体优先于
 * 本翻译结果（见 use-uikit.ts 的 mergeRepositoryOverrides）。
 */
export function translateDataSourceToRepositories(
  resolveDataSource: () => UIKitDataSource,
): SdkRepositoryOverrides {
  const contact = {} as Partial<ContactRepository>
  Object.defineProperties(contact, {
    fetchContacts: {
      enumerable: true,
      get: () => {
        const fn = resolveDataSource().fetchContacts
        if (!fn)
          return undefined
        return async (cursor?: string, pageSize?: number) => {
          const result = await fn({ cursor, pageSize })
          return { list: result.list, cursor: result.cursor, hasMore: result.hasMore ?? false }
        }
      },
    },
    fetchBlocklist: {
      enumerable: true,
      get: () => resolveDataSource().fetchBlocklist,
    },
    addContact: {
      enumerable: true,
      get: () => resolveDataSource().addContact,
    },
  })

  const group = {} as Partial<GroupRepository>
  Object.defineProperties(group, {
    fetchGroups: {
      enumerable: true,
      get: () => {
        const fn = resolveDataSource().fetchGroups
        if (!fn)
          return undefined
        return async (cursor?: string, pageSize?: number) => {
          const result = await fn({ cursor, pageSize })
          return { list: result.list, cursor: result.cursor, hasMore: result.hasMore ?? false }
        }
      },
    },
    createGroup: {
      enumerable: true,
      get: () => resolveDataSource().createGroup,
    },
  })

  const presence = {} as Partial<PresenceRepository>
  Object.defineProperties(presence, {
    fetchStatus: {
      enumerable: true,
      get: () => resolveDataSource().fetchPresence,
    },
    subscribe: {
      enumerable: true,
      get: () => {
        const fn = resolveDataSource().subscribePresence
        if (!fn)
          return undefined
        // 旧 dataSource 签名无 expiry 参数，丢弃之（行为与旧消费点一致）
        return async (userIds: string[]) => {
          await fn(userIds)
        }
      },
    },
    unsubscribe: {
      enumerable: true,
      get: () => {
        const fn = resolveDataSource().unsubscribePresence
        if (!fn)
          return undefined
        return async (userIds: string[]) => {
          await fn(userIds)
        }
      },
    },
  })

  const userInfo = {} as Partial<UserInfoRepository>
  Object.defineProperties(userInfo, {
    fetchUserInfos: {
      enumerable: true,
      get: () => {
        const fn = resolveDataSource().fetchUserInfos
        if (!fn)
          return undefined
        // 旧 dataSource 签名无 attributes 参数且允许返回部分字段；
        // 字段收敛（九属性）由 UserInfoDomain 兜底
        return ((userIds: string[]) => fn(userIds)) as UserInfoRepository['fetchUserInfos']
      },
    },
  })

  return { contact, group, presence, userInfo }
}

/**
 * 合并 repositories 覆盖项：显式注入（SdkConfig.repositories / sdkConfig 平铺下沉）
 * 按域整体优先于 dataSource 翻译结果；message / conversation 只能来自显式注入。
 */
export function mergeRepositoryOverrides(
  translated: SdkRepositoryOverrides,
  explicit?: SdkRepositoryOverrides,
): SdkRepositoryOverrides {
  if (!explicit)
    return translated
  const merged: SdkRepositoryOverrides = { ...translated }
  for (const key of ['message', 'conversation', 'contact', 'group', 'presence', 'userInfo'] as const) {
    if (explicit[key])
      merged[key] = explicit[key]
  }
  return merged
}
