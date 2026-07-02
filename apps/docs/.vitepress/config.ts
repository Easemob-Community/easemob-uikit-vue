import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Easemob UIKit for Vue',
  description: '环信 Vue3 UIKit 组件库文档',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '组件', link: '/components/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/quickstart' },
            { text: '主题定制', link: '/guide/theme' },
            { text: 'H5 适配', link: '/guide/h5-adaptation' },
            { text: '进阶指南', link: '/guide/advanced' },
          ],
        },
      ],
      '/components/': [
        {
          text: '组件',
          items: [
            { text: 'Button', link: '/components/button' },
            { text: 'Avatar', link: '/components/avatar' },
            { text: 'Popup', link: '/components/popup' },
          ],
        },
      ],
    },
  },
})
