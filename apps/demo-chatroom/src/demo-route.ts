import { ref } from 'vue'

/**
 * demo-chatroom 路由状态（模块级共享：app.vue 判断宽屏壳，app-shell.vue 渲染页面）。
 */
export type DemoRoute = 'home' | 'basic' | 'voice' | 'live' | 'class' | 'danmaku' | 'pc-live' | 'pc-class'

/** 当前路由（hash 驱动） */
export const demoRoute = ref<DemoRoute>('home')

/** PC 宽屏路由（不套 375px 手机壳，全窗口渲染 split 布局） */
export const DEMO_PC_ROUTES: DemoRoute[] = ['pc-live', 'pc-class']

/** 路由是否为 PC 宽屏形态 */
export function isDemoPcRoute(route: DemoRoute): boolean {
  return DEMO_PC_ROUTES.includes(route)
}
