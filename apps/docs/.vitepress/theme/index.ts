import type { Theme } from 'vitepress'
// theme-without-fonts：移除默认 Inter，字体栈由 style.css 自定义（antfu vitepress skill 规范）
import DefaultTheme from 'vitepress/theme-without-fonts'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit-im'
import IconGallery from '../components/IconGallery.vue'
import ChangelogTabs from '../components/ChangelogTabs.vue'
import DocsConfigPanel from '../components/DocsConfigPanel.vue'
import VuePlayground from '../components/VuePlayground.vue'
import DemoBlock from './DemoBlock.vue'
import Layout from './Layout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.use(createPinia())
    app.use(UIKit)
    // 文档 demo 容器（对应 markdown 中的 <demo src="..." />），
    // DemoBlock 内部用 ClientOnly 包裹，避免 SSR 预渲染时访问浏览器 API
    app.component('demo', DemoBlock)
    // 图标画廊，展示 UIKit 当前内置的全部 SVG 图标
    app.component('IconGallery', IconGallery)
    // 更新日志三 tab 切换（uikit-im / core / chatroom）
    app.component('ChangelogTabs', ChangelogTabs)
    // 声明式配置面板：demo 内以 items 声明 + model 对象驱动开关，
    // 复刻 demo 应用设置面板交互（按钮组 / 复选框 / 数字输入 + 问号说明）
    app.component('DocsConfigPanel', DocsConfigPanel)
    // 可编辑代码实时预览演练场（@vue/repl 封装，本地 vendor 静态托管）
    app.component('VuePlayground', VuePlayground)
  },
} satisfies Theme
