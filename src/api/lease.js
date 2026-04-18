import request from '@/utils/request'

// 资源
export function createResource(data) {
  return request.post('/api/resources', data)
}

export function updateResource(id, data) {
  return request.post(`/api/resources/${id}`, data)
}

export function getResourceDetail(id) {
  return request.get(`/api/resources/${id}`)
}

export function getResourceList(params) {
  return request.get('/api/resources', { params })
}

export function offShelfResource(id) {
  return request.post(`/api/resources/${id}/off-shelf`)
}

export function getMyResources(params) {
  return request.get('/api/my/resources', { params })
}

// 订阅
export function createSubscription(data) {
  return request.post('/api/subscriptions', data)
}

export function renewSubscription(id, data) {
  return request.post(`/api/subscriptions/${id}/renew`, data)
}

export function cancelSubscription(id) {
  return request.post(`/api/subscriptions/${id}/cancel`)
}

export function getMySubscriptions(params) {
  return request.get('/api/my/subscriptions', { params })
}

export function getSubscriptionDetail(id) {
  return request.get(`/api/subscriptions/${id}`)
}
