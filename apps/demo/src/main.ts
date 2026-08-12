import { createApp } from 'vue'
import { createPinia } from 'pinia'
import UIKit, { mergeLocaleMessages } from '@easemob/uikit'
// uikit 产物模式下组件样式集中在主题 css（源码 alias 模式下由 .vue <style> 提供，两模式均需引入）
import '@easemob/uikit/theme'
import App from './app.vue'

// 业务方 / plugin 通过 mergeLocaleMessages 扩展自己的多语言 key
mergeLocaleMessages('zh-CN', {
  'demo.card.send': '发送名片',
  'demo.card.myCard': '我的名片',
  'demo.card.contactCard': '联系人名片',
  'demo.card.noAvailable': '暂无可发送的名片',
  'demo.quickReply.title': '快捷回复',
  'demo.quickReply.empty': '请先选择会话',
  'demo.quickReply.group.greet': '问候',
  'demo.quickReply.group.follow': '跟进',
  'demo.quickReply.group.end': '结束',
  'demo.quickReply.item.welcome': '欢迎语',
  'demo.quickReply.item.wait': '稍等',
  'demo.quickReply.item.shipped': '已发货',
  'demo.quickReply.item.processing': '处理中',
  'demo.quickReply.item.thanks': '感谢',
  'demo.quickReply.item.goodbye': '再见',
})

mergeLocaleMessages('en', {
  'demo.card.send': 'Send Card',
  'demo.card.myCard': 'My Card',
  'demo.card.contactCard': 'Contact Card',
  'demo.card.noAvailable': 'No card available',
  'demo.quickReply.title': 'Quick Replies',
  'demo.quickReply.empty': 'Please select a conversation first',
  'demo.quickReply.group.greet': 'Greeting',
  'demo.quickReply.group.follow': 'Follow-up',
  'demo.quickReply.group.end': 'Closing',
  'demo.quickReply.item.welcome': 'Welcome',
  'demo.quickReply.item.wait': 'Wait a moment',
  'demo.quickReply.item.shipped': 'Shipped',
  'demo.quickReply.item.processing': 'Processing',
  'demo.quickReply.item.thanks': 'Thanks',
  'demo.quickReply.item.goodbye': 'Goodbye',
})

const app = createApp(App)
app.use(createPinia())
app.use(UIKit)
app.mount('#app')
