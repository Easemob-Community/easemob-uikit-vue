import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit'
import { AntdTheme } from 'vite-plugin-vitepress-demo/theme'
import HomeLayout from './HomeLayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: HomeLayout,
  enhanceApp({ app }) {
    app.use(createPinia())
    app.use(UIKit)
    // 文档 demo 容器（对应 markdown 中的 <demo src="..." />）
    app.component('demo', AntdTheme)
  },
} satisfies Theme
