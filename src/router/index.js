import { createRouter, createWebHashHistory } from 'vue-router'
import GroupList from '../views/GroupList.vue'
import CreatGroup from '../views/CreateGroup.vue'
import GroupDetail from '../views/GroupDetail.vue'
// import CreateEvent from '../views/CreateEvent.vue'; 

const routes = [
  {
    path: '/list',
    name: 'GroupList',
    component: GroupList
  },
  {
    path: '/create',
    name: 'CreatGroup',
    component: CreatGroup
  },
  {
    path: '/group/:id', 
    name: 'GroupDetail',
    component: GroupDetail
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
