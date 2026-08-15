import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 聊天室场景包源码直连（vite alias）；locale 合并与主题在包入口 import 时生效
import '@easemob/uikit-chatroom'
import '@easemob/uikit-core/theme'
import App from './app.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
