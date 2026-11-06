# 联系人与群组类型

## UiContact

联系人包含 `userId`、可选 `name`、`avatar`、`remark`、`signature`、`gender`、`birth`、`phone`、`mail` 和 `ext`。展示名通常优先使用 `remark`，再回退到用户资料昵称。

## UiContactInvite

好友申请或群邀请包含：

- `id`、`type: 'contact' | 'group'`。
- `userId`、`nickname`、`avatarUrl`、`reason`。
- 群邀请的 `groupId`、`groupName`、`inviterId`、`inviterName`。
- `status: 'pending' | 'accepted' | 'declined'`、`outgoing`、`unread`、`timestamp`。

## UiGroup

群对象以 `groupId` 为必需字段，其他常用字段包括 `groupName`、`avatar`、`description`、`owner`、`role`、`memberCount`、`maxUsers`、`public`、`allowInvites`、`approval`、`mute`、`disabled`、`announcement` 和 `created`。

## UiGroupMember

成员包含 `userId`，以及可选 `nickname`、`avatarUrl`、`role`、`joinedAt`、`muteExpire`、`muteDuration`。

## CreateGroupParams

创建群参数：`name` 必填；`description`、`memberIds`、`public`、`joinApprovalRequired`、`allowInvites`、`inviteNeedConfirm`、`maxMembers` 可选。布尔选项默认均为 `false`。
