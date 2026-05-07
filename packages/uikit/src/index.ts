import type { App } from 'vue'

// Components
export * from './components'

// Modules
export * from './modules'

// Containers
export * from './containers'

// Composables
export * from './composables'

// Store
export * from './store'

// SDK
export * from './sdk'

// Locale
export * from './locale'

// Theme
import './theme/index.css'

// Install function for app.use(UIKit)
export function install(_app: App) {
  // Pinia 应由使用方自行创建，避免重复注册
}

export default {
  install,
}
