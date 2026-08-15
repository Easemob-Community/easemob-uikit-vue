import { defineConfig } from 'vitepress'

// 版本号：由 vitepress build 时注入（见 vite.config.ts）
const version = '__EASEMOB_UIKIT_VERSION__'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Easemob UIKit',
  description: '环信 Vue3 即时通讯 UI 组件库 - 官方文档',
  cleanUrls: true,
  // icons.md 引用了 packages/uikit-im 下的仓内文件（docs/UI_CONVENTIONS.md 等），属于仓库内文档链接，跳过校验
  ignoreDeadLinks: [/packages\/uikit/],

  head: [
    ['link', { rel: 'icon', href: '/favicon.png', type: 'image/png' }],
  ],

  themeConfig: {
    logo: { light: '/logo-light.png', dark: '/logo-dark.png' },
    siteTitle: 'Easemob UIKit',

    nav: [
      { text: '首页', link: '/', activeMatch: '^/$' },
      { text: '指南', link: '/guide/quickstart', activeMatch: '^/guide/(?!theme|h5-adaptation|changelog)' },
      { text: '组件', link: '/components/button', activeMatch: '^/components/' },
      { text: '主题定制', link: '/guide/theme', activeMatch: '^/guide/theme' },
      { text: 'H5 适配', link: '/guide/h5-adaptation', activeMatch: '^/guide/h5-adaptation' },
      { text: '更新日志', link: '/guide/changelog', activeMatch: '^/guide/changelog' },
      { text: 'GitHub', link: 'https://github.com/Easemob-Community/easemob-uikit-vue' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/quickstart' },
            { text: '主题定制', link: '/guide/theme' },
            { text: '图标', link: '/guide/icons' },
            { text: 'H5 适配', link: '/guide/h5-adaptation' },
            { text: '系统通知文案定制', link: '/guide/notice-customization' },
            { text: 'AI 流式消息', link: '/guide/ai-stream-message' },
            { text: '进阶指南', link: '/guide/advanced' },
            { text: 'AI 集成（Skills / MCP）', link: '/guide/ai-integration' },
            { text: 'Demo 第一期规划', link: '/guide/demo-phase1-plan' },
            { text: 'Demo 第二期规划（演练场）', link: '/guide/demo-phase2-plan' },
            { text: '更新日志', link: '/guide/changelog' },
          ],
        },
      ],
      '/components/': [
        // 顶级条目：全局能力（Provider / Store）置于分组之前
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
            { text: 'Empty 空状态', link: '/components/empty' },
            { text: 'Input 输入框', link: '/components/input' },
            { text: 'IconButton 图标按钮', link: '/components/icon-button' },
            { text: 'ScrollToTop 回到顶部', link: '/components/scroll-to-top' },
            { text: 'Resizable 拖拽尺寸', link: '/components/resizable' },
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
            { text: '添加联系人弹窗', link: '/components/add-contact-modal' },
            { text: '创建群组弹窗', link: '/components/create-group-modal' },
          ],
        },
      ],
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    lastUpdated: {
      text: '最近更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },

    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    langMenuLabel: '语言',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '未找到相关结果',
            resetButtonTitle: '清除查询',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    footer: {
      message: '基于 VitePress 构建 · 环信 Easemob UIKit',
      copyright: `Copyright © 2024-${new Date().getFullYear()} Easemob · UIKit v${version}`,
    },

    // 编辑本页：GitHub 仓库对应路径（apps/docs 为文档源目录）
    editLink: {
      pattern: 'https://github.com/Easemob-Community/easemob-uikit-vue/edit/main/apps/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
  },
})
