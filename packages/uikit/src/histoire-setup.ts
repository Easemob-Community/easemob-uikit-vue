import { createPinia } from 'pinia'
import 'virtual:uno.css'
import './theme/index.css'

export function setupVue3({ app }: { app: any }) {
  app.use(createPinia())
}
