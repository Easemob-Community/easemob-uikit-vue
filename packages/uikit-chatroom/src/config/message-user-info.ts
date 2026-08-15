/**
 * 消息 ext 用户信息配置（P4 review 需求 3）：
 * 大体量直播间为降低 userInfo 查询压力，发送方把昵称/头像放入消息 ext
 * （如 sendText(content, { ext: { nickname: '主播小美', avatar: 'https://...' } })），
 * 渲染端优先读消息 ext，缺失回落 useUserInfo 服务。
 *
 * - Provider 静态配置：useChatroomProvider({ messageUserInfo: { nicknameKey, avatarKey } })；
 * - hook 动态设置：useChatroomMessageUserInfo().setConfig(...)。
 */
export interface MessageUserInfoConfig {
  /** 昵称在消息 ext 中的 key（默认 'nickname'） */
  nicknameKey?: string
  /** 头像在消息 ext 中的 key（默认 'avatar'） */
  avatarKey?: string
}

const DEFAULT_CONFIG: Required<MessageUserInfoConfig> = {
  nicknameKey: 'nickname',
  avatarKey: 'avatar',
}

let config: Required<MessageUserInfoConfig> = { ...DEFAULT_CONFIG }

/** 设置消息 ext 用户信息配置（部分字段缺省用默认 key） */
export function setChatroomMessageUserInfoConfig(next: MessageUserInfoConfig): void {
  config = {
    nicknameKey: next.nicknameKey ?? DEFAULT_CONFIG.nicknameKey,
    avatarKey: next.avatarKey ?? DEFAULT_CONFIG.avatarKey,
  }
}

/** 读取当前消息 ext 用户信息配置 */
export function getChatroomMessageUserInfoConfig(): Required<MessageUserInfoConfig> {
  return config
}

/** 从消息 ext 读取昵称（无配置 key / 非字符串时返回 undefined） */
export function readNicknameFromMessageExt(ext: Record<string, unknown> | undefined): string | undefined {
  const value = ext?.[config.nicknameKey]
  return typeof value === 'string' ? value : undefined
}

/** 从消息 ext 读取头像（无配置 key / 非字符串时返回 undefined） */
export function readAvatarFromMessageExt(ext: Record<string, unknown> | undefined): string | undefined {
  const value = ext?.[config.avatarKey]
  return typeof value === 'string' ? value : undefined
}
