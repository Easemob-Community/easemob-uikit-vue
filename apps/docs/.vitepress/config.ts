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

  /**
   * 双 UIKit 文档：复用 VitePress locales 机制承载「两套并列文档树」，
   * 每个前缀拥有独立的 nav / sidebar（themeConfig 浅合并，per-locale 覆盖全局）。
   *
   * ⚠️ key 约定（踩坑记录）：locale key **不带斜杠**——`root` 是默认 locale 的保留字
   * （无 URL 前缀，getLocaleForPath 的 find 显式排除它，未匹配路径回退为 'root' 后
   * 直接索引 locales['root']）；非 root key 会被拼成 `/<key>/` 正则做前缀匹配。
   * 若写成带斜杠的 '/' / '/chatroom/'，会拼出 '//' / '//chatroom//' 永不匹配，
   * 所有页面回退 'root' 而 locales['root'] 不存在 → 两套文档 nav/sidebar 全部丢失。
   *
   * - root      → 单群聊 UIKit（@easemob/uikit-im）文档（既有文档，URL 无前缀）
   * - chatroom  → 聊天室 UIKit（@easemob/uikit-chatroom）文档（URL 前缀 /chatroom/，
   *               指南 + 组件页 + 自动生成 API 表格，1.0.0 起完整落地）
   *
   * 顶部标题旁的自定义切换器（.vitepress/theme/components/UiKitDocsSwitcher.vue）负责两树切换；
   * 桌面端默认的「语言」下拉已隐藏（theme/style.css），移动端菜单内的切换入口保留。
   */
  locales: {
    root: {
      label: '单群聊 UIKit',
      themeConfig: {
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
      },
    },

    chatroom: {
      label: '聊天室 UIKit',
      themeConfig: {
        nav: [
          { text: '首页', link: '/chatroom/', activeMatch: '^/chatroom/$' },
          { text: '指南', link: '/chatroom/guide/quickstart', activeMatch: '^/chatroom/guide/' },
          { text: 'GitHub', link: 'https://github.com/Easemob-Community/easemob-uikit-vue' },
        ],

        sidebar: {
          '/chatroom/guide/': [
            {
              text: '指南',
              items: [
                { text: '双 UIKit 架构', link: '/chatroom/guide/architecture' },
                { text: '快速开始', link: '/chatroom/guide/quickstart' },
                { text: '权限模型与业务角色', link: '/chatroom/guide/permissions-roles' },
                { text: '更新日志', link: '/chatroom/guide/changelog' },
              ],
            },
          ],
          '/chatroom/components/': [
            {
              text: '容器',
              collapsed: false,
              items: [
                { text: 'ChatroomContainer 聊天室容器', link: '/chatroom/components/chatroom-container' },
              ],
            },
            {
              text: '直播组件',
              collapsed: false,
              items: [
                { text: '直播弹幕流 DanmakuStream', link: '/chatroom/components/live-danmaku' },
                { text: '直播顶部栏 LiveTopBar', link: '/chatroom/components/live-top-bar' },
                { text: '直播间输入条 LiveInputBar', link: '/chatroom/components/live-input-bar' },
                { text: '礼物入口 GiftBar', link: '/chatroom/components/gift-bar' },
                { text: '欢迎横幅 WelcomeBanner', link: '/chatroom/components/live-welcome-banner' },
                { text: '可交互卡片 InteractiveCard', link: '/chatroom/components/live-interactive-card' },
                { text: 'overlay 锚定管理器', link: '/chatroom/components/live-overlay-manager' },
                { text: '全屏动效 FullscreenEffect', link: '/chatroom/components/live-fullscreen-effect' },
              ],
            },
            {
              text: 'PC 模式',
              collapsed: false,
              items: [
                { text: '分栏布局 SplitLayout', link: '/chatroom/components/chatroom-split-layout' },
                { text: '成员侧栏 MemberSidebar', link: '/chatroom/components/chatroom-member-sidebar' },
                { text: '右键菜单 ContextMenu', link: '/chatroom/components/chatroom-context-menu' },
              ],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    logo: { light: '/logo-light.png', dark: '/logo-dark.png' },
    siteTitle: 'Easemob UIKit',

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
