import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/lease/plaza'
  },
  {
    path: '/lease',
    name: 'Lease',
    redirect: '/lease/plaza',
    children: [
      {
        path: 'plaza',
        name: 'Plaza',
        component: () => import('@/views/lease/plaza.vue'),
        meta: { title: '资源广场' }
      },
      {
        path: 'resource/:id',
        name: 'ResourceDetail',
        component: () => import('@/views/lease/detail.vue'),
        meta: { title: '资源详情' }
      },
      {
        path: 'my-publish',
        name: 'MyPublish',
        component: () => import('@/views/lease/my-publish.vue'),
        meta: { title: '我的发布' }
      },
      {
        path: 'resource-form',
        name: 'ResourceFormCreate',
        component: () => import('@/views/lease/resource-form-fixed.vue'),
        meta: { title: '发布资源' }
      },
      {
        path: 'resource-form/:id',
        name: 'ResourceFormEdit',
        component: () => import('@/views/lease/resource-form-fixed.vue'),
        meta: { title: '编辑资源' }
      },
      {
        path: 'my-subscription',
        name: 'MySubscription',
        component: () => import('@/views/lease/my-subscription.vue'),
        meta: { title: '我的订阅' }
      }
    ]
  },
  {
    path: '/production/:resourceId?',
    name: 'Production',
    component: () => import('@/views/production/index.vue'),
    meta: { title: '农场生产' }
  },
  {
    path: '/sharing',
    name: 'Sharing',
    component: () => import('@/views/sharing'),
    meta: { title: '\u519c\u4ea7\u54c1\u5171\u4eab' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
