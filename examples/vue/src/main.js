import Vue from 'vue'
import VueRx from 'vue-rx'
import App from './App.vue'

Vue.use(VueRx)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
