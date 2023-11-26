import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import 'normalize.css'
import _ from 'lodash-es'
import App from './App.vue'
import router from './router'

Vue.use(ElementUI)
Vue.prototype.$lodash = _

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
