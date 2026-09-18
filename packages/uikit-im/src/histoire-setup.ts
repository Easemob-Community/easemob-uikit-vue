import { createPinia } from 'pinia'
import './theme/index.css'
// 注册 websdk5 默认适配器（副作用）：story 中 <UIKitProvider> 不传 adapter 时可直接渲染。
// 经源码相对路径引入，保证 registerDefaultSdkAdapterFactory 落在被 alias 到源码的 core 单例上。
import './websdk5'

export function setupVue3({ app }: { app: any }) {
  app.use(createPinia())
}
