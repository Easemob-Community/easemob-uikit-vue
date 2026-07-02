import { createPinia } from 'pinia'
import './theme/index.css'

export function setupVue3({ app }: { app: any }) {
  app.use(createPinia())
}
