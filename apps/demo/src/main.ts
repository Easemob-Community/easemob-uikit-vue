import { createApp } from 'vue'
import { createPinia } from 'pinia'
import UIKit from '@easemob/uikit'
import App from './app.vue'

const app = createApp(App)
app.use(createPinia())
app.use(UIKit)
app.mount('#app')
