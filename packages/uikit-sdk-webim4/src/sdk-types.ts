import type { EasemobChat } from 'easemob-websdk-4'

// 4.x SDK 专属类型（经 EasemobChat 命名空间 re-export，供下游与其它 adapter 模块消费）。
export type MessagesType = EasemobChat.MessagesType
export type MessageBody = EasemobChat.MessageBody
export type TextMsgBody = EasemobChat.TextMsgBody
export type ImgMsgBody = EasemobChat.ImgMsgBody
export type AudioMsgBody = EasemobChat.AudioMsgBody
export type VideoMsgBody = EasemobChat.VideoMsgBody
export type FileMsgBody = EasemobChat.FileMsgBody
export type LocationMsgBody = EasemobChat.LocationMsgBody
export type CmdMsgBody = EasemobChat.CmdMsgBody
export type CustomMsgBody = EasemobChat.CustomMsgBody
export type CombineMsgBody = EasemobChat.CombineMsgBody
export type ReadMsgBody = EasemobChat.ReadMsgBody
export type DeliveryMsgBody = EasemobChat.DeliveryMsgBody
export type ChannelMsgBody = EasemobChat.ChannelMsgBody
export type StreamMsgBody = EasemobChat.StreamMsgBody
export type ChatType = EasemobChat.ChatType
export type SendMsgResult = EasemobChat.SendMsgResult
export type EventHandlerType = EasemobChat.EventHandlerType
export type ConversationItem = EasemobChat.ConversationItem
export type ServerConversations = EasemobChat.ServerConversations
