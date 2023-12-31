import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import 'normalize.css'
import '@/style/index.scss'
import _ from 'lodash-es'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import '@/icons'

Vue.use(ElementUI)
Vue.prototype.$lodash = _
Vue.prototype.$axios = axios

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
