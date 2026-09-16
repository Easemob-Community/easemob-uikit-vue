# 通讯录模块

通讯录容器，聚合「通知 / 群组列表 / 好友列表」三大入口：首页入口导航 + 好友列表子视图（字母分组、在线状态、多选）+ 群组列表子视图 + 通知子视图，内置视图切换过场动画。

## 使用方式

组件以 `EmContactContainer` 为名导出。需在 `EmUIKitProvider` 内使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'

function goDetail() {
  // 跳转联系人详情页
}

function onCreateGroup() {
  // 打开创建群组弹窗
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-contact
  >
    <div style="height: 100vh; width: 360px;">
      <em-contact-container
        title="通讯录"
        :notice-count="3"
        @contact-click="goDetail"
        @create-group="onCreateGroup"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> Provider 需开启 `enable-contact`（默认开启）才会自动拉取好友与群组数据；`notice-count` 用于展示「通知」入口的徽标数量。

## 联系人列表项

`EmContactItem` 是联系人列表的基础展示单元，支持副标题、在线状态、头像形状与选择模式：

<demo src="./demo/item.vue" title="联系人列表项" desc="静态展示在线状态（online / away / busy / offline）、备注名与副标题；select-mode 可切换单选 / 多选交互。" />

## 联系人排序（sortBy）与拼音分组

联系人子列表（`EmContactList`）与通讯录容器的联系人子视图通过 `sortBy` / `groupBy` 控制排序与分组：

- `sortBy`：`'none'`（保持 store 顺序）｜`'pinyin'`（按 remark/name 拼音字典序升序）｜`(a,b)=>number`（自定义比较器），默认 `'none'`
- `groupBy`：`'alphabet'`（A-Z + `#` 字母分组）｜`'none'`（不分组）｜函数，默认 `'alphabet'`

> **⚠️ 关键：UIKit 不内置任何拼音库。** 要让 `sortBy='pinyin'` 真正按中文拼音排序、让 `groupBy='alphabet'` 把中文姓归入 A-Z 分组，必须先调用 `setPinyinAdapter` 注入拼音 adapter。未注入时 `resolvePinyin` 返回 `null`，中文会降级为按原文 `localeCompare` 排序，并统一落入 `#` 分组。

### 注入拼音 adapter

UIKit 把具体拼音库（pinyin-pro / tiny-pinyin / pinyinlite …）解耦成可注入的 adapter，接口：

```ts
type PinyinAdapter = (text: string) => {
  pinyin: string       // 完整拼音（小写无声调），如 "zhangsan"
  initials: string     // 首字母缩写（小写），如 "zs"，用于拼音搜索
  firstLetter: string  // 首字母大写 A-Z 或 '#' 兜底，用于字母分组
}
```

在你应用初始化时（渲染联系人列表之前）调用一次即可：

```ts
import { pinyin } from 'pinyin-pro'
import { setPinyinAdapter } from '@easemob/uikit-im'

setPinyinAdapter((text) => {
  const full = pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
    .replace(/\s+/g, '')
    .toLowerCase()
  const initialsRaw = pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' })
    .replace(/\s+/g, '')
    .toLowerCase()
  const firstChar = initialsRaw.charAt(0).toUpperCase()
  return {
    pinyin: full,
    initials: initialsRaw,
    firstLetter: /^[A-Z]$/.test(firstChar) ? firstChar : '#',
  }
})
```

`setPinyinAdapter` 是**模块级全局单例**：注入一次对当前页面所有联系人 / 群组列表生效；传入 `null` 可解除注入（恢复默认行为）。

<demo src="./demo/pinyin-sort.vue" title="对照组：未注入 vs 注入拼音 adapter" desc="同一批中文联系人，未注入 adapter 时全部落入 # 分组、不按拼音排序；注入 adapter 后按拼音字典序排序并按首字母 A-Z 分组（sort-by='pinyin' + group-by='alphabet'）。点击按钮切换。" />

### 配套能力

- **拼音搜索**：注入 adapter 后，搜索框同时按完整拼音 / 首字母缩写匹配（`useContactFilter` / `useGroupFilter`）。
- **清理缓存**：`resolvePinyin` 内部按文本缓存（上限 1000）。联系人备注 / 名称更新后可调用 `clearPinyinCache()`（同样从 `@easemob/uikit-im` 导出）刷新结果。
- **群组列表**：群组子列表走同一机制，`group-sort-by="pinyin"` / `group-group-by="alphabet"`。

## 联系人详情 EmContactDetail

`EmContactDetail` 联系人详情模块：头像（含在线状态）、昵称 / 用户名 / 用户 ID、备注编辑（行内弹窗）、发消息胶囊按钮，底部提供「拉黑 / 取消拉黑」「删除联系人」操作（带确认弹窗），SDK 调用与结果 toast 由组件内部完成。

```vue
<script setup lang="ts">
import { EmUIKitProvider, EmContactDetail } from '@easemob/uikit-im'

function onSendMessage(userId: string) {
  // 跳转到与该联系人的单聊
}

function onBlockChanged(userId: string, blocked: boolean) {
  // 拉黑 / 取消拉黑成功
}

function onDeleted(userId: string) {
  // 删除联系人成功，返回列表
}

function onRemarkChanged(userId: string, remark: string) {
  // 备注保存成功
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-contact
    enable-blocklist
    enable-presence
  >
    <div style="height: 100vh; width: 360px;">
      <em-contact-detail
        user-id="user-id-to-show"
        @send-message="onSendMessage"
        @block-changed="onBlockChanged"
        @deleted="onDeleted"
        @remark-changed="onRemarkChanged"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> 底部「拉黑 / 取消拉黑」操作需开启 `enable-blocklist`（默认开启）；头像在线状态需开启 `enable-presence`。

<!-- @include: ../.vitepress/gen/contact-detail.md -->

### 插槽

| 名称 | 作用域 | 说明 |
| ---- | ---- | ---- |
| `avatar` | `{ userId, avatar, displayName, presence }` | 接管头像区（默认渲染头像 + 在线状态点） |
| `header` | `{ userId, displayName, nickname, presence }` | 接管名称与 Username / UserID 信息区 |
| `alias` | `{ userId, remark }` | 接管备注行；接管后内置备注编辑入口不再渲染 |
| `extra` | `{ userId, userInfo, contact }` | 在备注行与操作按钮之间插入自定义内容 |
| `actions` | `{ userId }` | 接管「发消息」胶囊按钮区 |
| `footer` | `{ userId, blocked }` | 接管拉黑 / 删除按钮区 |

## 通知列表 EmContactNoticeList

`EmContactNoticeList` 通知列表模块：聚合展示好友申请与群邀请（头像、附言、时间、接受 / 拒绝按钮），已处理项展示状态标签，store 中已是好友 / 已入群的 pending 申请会自动显示为「已接受」。通常无需单独引入——通讯录容器的「通知」子视图默认渲染的就是该组件；单独引入适合自绘通知页场景。

```vue
<script setup lang="ts">
import { EmUIKitProvider, EmContactNoticeList } from '@easemob/uikit-im'
import type { UiContactInvite } from '@easemob/uikit-im'

function onAccept(invite: UiContactInvite) {
  // 接受成功（SDK 调用由组件内部完成）
}

function onDecline(invite: UiContactInvite) {
  // 拒绝成功
}
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :auto-init="true" enable-contact>
    <div style="height: 100vh; width: 360px;">
      <em-contact-notice-list persist="local" @accept="onAccept" @decline="onDecline" />
    </div>
  </EmUIKitProvider>
</template>
```

<!-- @include: ../.vitepress/gen/contact-notice-list.md -->

> `persist` 传 `true` 等价于 `'local'`（localStorage），`'session'` 仅存于会话级存储；开启后通讯录首页徽标在刷新后也能立即显示红点。

## Props

### 容器外观

- `showHeader`：是否展示头部，默认 `true`
- `title`：Header 标题文本
- `headerAlign`：Header 对齐方式，默认 `'left'`
- `showSearch`：统一搜索框开关，默认 `true`
- `showScrollToTop`：是否展示滚动置顶按钮，默认 `true`
- `transition`：视图切换过场，`'none' | 'slide' | 'fade'`，默认 `'slide'`

> `title` 仅作用于首页（home）头部；好友列表 / 群组列表等**子视图头部**文案跟随各自入口 `label`（默认走 i18n「好友列表」「群组列表」，可用 `contactLabel` / `groupLabel` 覆盖）。

### 聚合入口

- `showNotice`：是否展示「通知」入口，默认 `true`（`showNewRequest` 为废弃别名）
- `showGroup` / `showContact`：是否展示「群组列表」/「好友列表」入口，默认 `true`
- `noticeCount`：通知徽标数量，默认 `0`（`newRequestCount` 为废弃别名）
- `groupCount` / `contactCount`：入口右侧数量，不传默认取 store 实际数量
- `autoEntryCount`：是否自动推断入口数量，默认 `true`
- `entryOrder`：入口顺序，默认 `['notice', 'group', 'contact', 'blocklist']`
- `noticeLabel` / `groupLabel` / `contactLabel`：自定义入口文案
- `noticeIcon` / `groupIcon` / `contactIcon`：自定义入口图标
- `entries`：自定义入口列表（`AddressBookContainerEntry[]`），可与内置入口共存
- `initialView`：初始视图，默认 `'home'`
- `showContactAddButton`：联系人子视图头部是否展示「添加好友」按钮，默认 `true`
- `showGroupCreateButton`：群组子视图头部是否展示「创建群组」按钮，默认 `true`

### 联系人子列表

- `emptyText`：空列表提示文字
- `filterFn`：自定义搜索过滤函数
- `sortBy`：排序方式，`'none' | 'pinyin' | 自定义比较器`，默认 `'none'`
- `groupBy`：分组方式，默认 `'alphabet'`
- `showGroupHeader` / `showAlphabetNav`：分组标题 / 字母导航，默认 `true`
- `selectMode`：选择模式，`'none' | 'single' | 'multiple'`，默认 `'none'`
- `selectedIds`：受控选中 id 列表（`v-model:selectedIds`）
- `maxSelected`：最大可选数量
- `disabledFn`：disabled 判定函数
- `subtitleFn`：副标题提取函数
- `onlineStatusFn`：在线状态提取函数
- `showAvatar` / `avatarSize` / `avatarShape`：头像展示配置
- `itemSize`：`'compact' | 'normal' | 'large'`，默认 `'normal'`
- `loading` / `enableLoadMore` / `loadMoreThreshold` / `noMoreText`：加载与分页配置

### 群组子列表

- `groupSortBy` / `groupGroupBy`：群组排序与分组
- `groupSelectMode` / `groupSelectedIds` / `groupMaxSelected` / `groupDisabledFn`：群组选择配置
- `groupSubtitleFn` / `groupShowAvatar` / `groupShowMemberCount` / `groupItemSize`：群组项展示配置
- `groupLoading` / `groupEnableLoadMore` / `groupFilterFn` / `groupEmptyText`：群组加载与过滤

### 在线状态与自治拉取

- `enablePresence`：联系人头像是否展示在线状态；不传则使用 Provider 全局配置
- `autoFetch` / `autoFetchGroups`：mount 时自动拉取联系人 / 群组列表，默认 `true`

## 事件

- `view-change`：视图切换，参数 `view: 'home' | 'group' | 'contact' | 'notice' | 'blocklist'`
- `entry-click`：点击入口，参数 `key: string`
- `notice-click`：点击「通知」入口（`new-request-click` 为废弃别名）
- `home-search` / `contact-search` / `group-search`：各视图搜索，参数 `keyword: string`
- `contact-click` / `contact-select`：点击 / 选中联系人，参数 `contact: Contact`
- `contact-contextmenu`：联系人右键，参数 `(event, contact)`
- `contact-load-more` / `contact-max-exceed`：联系人加载更多 / 超出最大选择
- `update:selectedIds`：联系人选中变化，参数 `ids: string[]`
- `group-click` / `group-select`：点击 / 选中群组，参数 `group: Group`
- `group-contextmenu` / `group-load-more` / `group-max-exceed`：群组右键 / 加载更多 / 超限
- `update:groupSelectedIds`：群组选中变化，参数 `ids: string[]`
- `add-contact`：点击「添加好友」按钮
- `create-group`：点击「创建群组」按钮

## 插槽

- `header` / `header-extra`：头部与头部附加内容
- `nav` / `nav-entry` / `nav-entry-extra`：首页入口导航自定义
- `home-body` / `home-footer`：首页入口下方内容
- `back-icon` / `subheader-extra`：子视图返回按钮与附加操作
- `item` / `contact-search`：联系人列表项与搜索框自定义
- `group-item` / `group-search`：群组列表项与搜索框自定义
- `notice`：通知子视图内容（不传则默认渲染通知列表）
- `body` / `footer` / `loading` / `empty` 等：列表通用插槽
- `watermark`：通讯录水印覆盖层，铺满整个通讯录区域（首页入口 / 好友列表 / 群组列表 / 黑名单列表），`pointer-events: none` 不响应交互，内容由用户注入（`EmContactListContainer` / `EmContactList` / `EmGroupListContainer` / `EmGroupList` / `EmBlockListContainer` / `EmBlockList` 同样支持该插槽）

## 实例方法

- `goHome()` / `goContact()` / `goGroup()` / `goNotice()` / `goTo(key)`：命令式切换视图
- `setView(key)`：`goTo` 的别名
- `scrollToGroup(key)`：滚动到指定分组
