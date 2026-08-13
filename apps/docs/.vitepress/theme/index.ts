import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit'
import IconGallery from '../components/IconGallery.vue'
import DocsConfigPanel from '../components/DocsConfigPanel.vue'
import DemoBlock from './DemoBlock.vue'
import HomeLayout from './HomeLayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: HomeLayout,
  enhanceApp({ app }) {
    app.use(createPinia())
    app.use(UIKit)
    // 文档 demo 容器（对应 markdown 中的 <demo src="..." />），
    // DemoBlock 内部用 ClientOnly 包裹，避免 SSR 预渲染时访问浏览器 API
    app.component('demo', DemoBlock)
    // 图标画廊，展示 UIKit 当前内置的全部 SVG 图标
    app.component('IconGallery', IconGallery)
    // 声明式配置面板：demo 内以 items 声明 + model 对象驱动开关，
    // 复刻 demo 应用设置面板交互（按钮组 / 复选框 / 数字输入 + 问号说明）
    app.component('DocsConfigPanel', DocsConfigPanel)
  },
} satisfies Theme
