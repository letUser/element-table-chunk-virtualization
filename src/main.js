// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import table from './main'

import { Table, TableColumn } from 'element-ui'

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
    el: '#virt-el-table',
    components: { table },
    template: '<table />'
})

Vue.use(Table)
Vue.use(TableColumn)
