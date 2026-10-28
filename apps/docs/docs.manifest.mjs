const designSystemItems = [
  { text: '主题定制', link: '/guide/theme' },
  { text: '设计变量（Design Tokens）', link: '/guide/design-tokens' },
  { text: '图标', link: '/guide/icons' },
]

export default {
  product: 'vue',
  entries: [
    { from: 'apps/docs/index.md', to: 'index.md' },
    { from: 'apps/docs/guide', to: 'guide' },
    { from: 'apps/docs/components', to: 'components' },
    { from: 'apps/docs/chatroom', to: 'chatroom' },
    { from: 'apps/docs/public', to: 'public' },
    { from: 'apps/docs/.vitepress/gen', to: '.vitepress/gen' },
  ],
  versionFiles: {
    im: 'packages/uikit-im/package.json',
    core: 'packages/uikit-core/package.json',
    chatroom: 'packages/uikit-chatroom/package.json',
  },
  locale: {
    label: '单群聊 UIKit',
    themeConfig: {
      nav: [
        { text: '首页', link: '/', activeMatch: '^/$' },
        { text: '指南', link: '/guide/quickstart', activeMatch: '^/guide/' },
        { text: '组件', link: '/components/button', activeMatch: '^/components/' },
        { text: 'GitHub', link: 'https://github.com/Easemob-Community/easemob-uikit-vue' },
      ],
      sidebar: {
        '/guide/': [
          {
            text: '开始',
            items: [
              { text: '快速开始', link: '/guide/quickstart' },
            ],
          },
          {
            text: '功能指南',
            items: [
              { text: '术语与数据模型', link: '/guide/data-model' },
              { text: '系统通知文案定制', link: '/guide/notice-customization' },
              { text: 'AI 流式消息', link: '/guide/ai-stream-message' },
              { text: '进阶指南', link: '/guide/advanced' },
              { text: 'AI 集成（Skills / MCP）', link: '/guide/ai-integration' },
            ],
          },
          {
            text: '设计系统',
            items: designSystemItems,
          },
          {
            text: 'H5 适配',
            items: [
              { text: 'H5 适配指南', link: '/guide/h5-adaptation' },
            ],
          },
          {
            text: '更新日志',
            items: [
              { text: '查看更新日志', link: '/guide/changelog' },
            ],
          },
        ],
        '/components/': [
          { text: 'Provider 全局配置', link: '/components/provider' },
          { text: 'Store 状态管理', link: '/components/stores' },
          {
            text: '基础组件',
            collapsed: false,
            items: [
              { text: 'Button 按钮', link: '/components/button' },
              { text: 'Icon 图标', link: '/components/icon' },
              { text: 'Avatar 头像', link: '/components/avatar' },
              { text: 'Badge 徽标', link: '/components/badge' },
              { text: 'Cell 单元格', link: '/components/cell' },
              { text: 'Checkbox 多选指示', link: '/components/checkbox' },
              { text: 'CopyableText 可复制文本', link: '/components/copyable-text' },
              { text: 'Empty 空状态', link: '/components/empty' },
              { text: 'Input 输入框', link: '/components/input' },
              { text: 'IconButton 图标按钮', link: '/components/icon-button' },
              { text: 'ScrollToTop 回到顶部', link: '/components/scroll-to-top' },
              { text: 'Skeleton 骨架屏', link: '/components/skeleton' },
              { text: 'Switch 开关', link: '/components/switch' },
              { text: 'Resizable 拖拽尺寸', link: '/components/resizable' },
              { text: 'Text 排版文本', link: '/components/text' },
            ],
          },
          {
            text: '反馈组件',
            collapsed: false,
            items: [
              { text: 'ActionSheet 操作菜单', link: '/components/action-sheet' },
              { text: 'Modal 弹窗', link: '/components/modal' },
              { text: 'Popup 弹出层', link: '/components/popup' },
              { text: 'Toast 轻提示', link: '/components/toast' },
              { text: 'StatusBanner 状态横幅', link: '/components/status-banner' },
              { text: 'Notification 消息通知', link: '/components/notification' },
              { text: 'EmojiPicker 表情选择', link: '/components/emoji-picker' },
              { text: 'ImageViewer 图片预览', link: '/components/image-viewer' },
            ],
          },
          {
            text: '数据展示',
            collapsed: false,
            items: [
              { text: 'PresenceAvatar 在线头像', link: '/components/presence-avatar' },
              { text: 'PresenceSelector 状态选择', link: '/components/presence-selector' },
              { text: 'UserCard 用户卡片', link: '/components/user-card' },
              { text: 'GroupCard 群组卡片', link: '/components/group-card' },
            ],
          },
          {
            text: '业务模块',
            collapsed: false,
            items: [
              { text: '会话模块', link: '/components/conversation-container' },
              { text: '聊天模块', link: '/components/chat-container' },
              { text: '消息列表 MessageList', link: '/components/message-list' },
              { text: '通讯录模块', link: '/components/contact-container' },
              { text: '地址簿容器', link: '/components/address-book-container' },
              { text: '群组模块', link: '/components/group-container' },
              { text: '群管理模块', link: '/components/group-management' },
              { text: '黑名单模块', link: '/components/block-list' },
              { text: '添加联系人弹窗', link: '/components/add-contact-modal' },
              { text: '创建群组弹窗', link: '/components/create-group-modal' },
            ],
          },
        ],
      },
      editLink: {
        pattern: 'https://github.com/Easemob-Community/easemob-uikit-vue/edit/main/apps/docs/:path',
        text: '在 GitHub 上编辑此页',
      },
    },
  },
}
