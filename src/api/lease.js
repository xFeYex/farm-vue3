import request from '@/utils/request'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

function unwrapResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('服务返回数据异常')
  }

  if (result.code !== 200) {
    const error = new Error(result.message || '请求失败')
    error.code = result.code
    error.result = result
    throw error
  }

  return result.data
}

function rethrowRequestError(error) {
  const message = error?.response?.data?.message || error?.message || '请求失败'
  const nextError = new Error(message)
  nextError.code = error?.response?.data?.code || error?.response?.status || error?.code
  nextError.cause = error
  throw nextError
}

function withManualUser(config = {}) {
  return {
    autoInjectUser: false,
    ...config,
  }
}

function cleanObject(source = {}) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

function normalizePageParams(params = {}) {
  const page = Number(params.page ?? DEFAULT_PAGE)
  const pageSize = Number(params.pageSize ?? DEFAULT_PAGE_SIZE)

  return cleanObject({
    ...params,
    page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(pageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE,
  })
}

function getCurrentUserId() {
  if (typeof window === 'undefined') {
    return 2001
  }

  const savedUserId = window.localStorage.getItem('farming_user_id')
  const nextUserId = Number(savedUserId)

  return Number.isFinite(nextUserId) ? nextUserId : 2001
}

function get(url, params) {
  return request
    .get(url, withManualUser({ params: cleanObject(params) }))
    .then(unwrapResult)
    .catch(rethrowRequestError)
}

function post(url, data) {
  return request
    .post(url, cleanObject(data), withManualUser())
    .then(unwrapResult)
    .catch(rethrowRequestError)
}

function put(url, data) {
  return request
    .put(url, cleanObject(data), withManualUser())
    .then(unwrapResult)
    .catch(rethrowRequestError)
}

// 资源
export function createResource(data = {}) {
  return post('/api/resources', {
    userId: Number(data.userId ?? data.ownerUserId ?? getCurrentUserId()),
    title: data.title,
    resourceType: data.resourceType,
    area: Number(data.area),
    locationDesc: data.locationDesc,
    pricePerMonth: Number(data.pricePerMonth),
    minLeaseMonths: Number(data.minLeaseMonths),
    description: data.description,
  })
}

export function getResourceDetail(id) {
  return get(`/api/resources/${id}`)
}

export function updateResource(id, data = {}) {
  return put(`/api/resources/${id}`, {
    userId: Number(data.userId ?? data.ownerUserId ?? getCurrentUserId()),
    title: data.title,
    resourceType: data.resourceType,
    area: Number(data.area),
    locationDesc: data.locationDesc,
    pricePerMonth: Number(data.pricePerMonth),
    minLeaseMonths: Number(data.minLeaseMonths),
    description: data.description,
  })
}

export function getResourceList(params = {}) {
  return get('/api/resources', normalizePageParams(params))
}

export function offShelfResource(id, userId = getCurrentUserId()) {
  return post(`/api/resources/${id}/off-shelf`, {
    userId: Number(userId),
  })
}

export function getMyResources(params = {}) {
  return get(
    '/api/my/resources',
    normalizePageParams({
      ...params,
      userId: Number(params.userId ?? getCurrentUserId()),
    }),
  )
}

// 订阅
export function createSubscription(data = {}) {
  return post('/api/subscriptions', {
    resourceId: Number(data.resourceId),
    userId: Number(data.userId ?? data.tenantUserId ?? getCurrentUserId()),
    startDate: data.startDate,
    leaseMonths: Number(data.leaseMonths),
  })
}

export function renewSubscription(id, data = {}) {
  return post(`/api/subscriptions/${id}/renew`, {
    userId: Number(data.userId ?? getCurrentUserId()),
    leaseMonths: Number(data.leaseMonths),
  })
}

export function cancelSubscription(id, payload = {}) {
  const resolvedUserId =
    typeof payload === 'object' && payload !== null
      ? payload.userId ?? getCurrentUserId()
      : payload || getCurrentUserId()

  return post(`/api/subscriptions/${id}/cancel`, {
    userId: Number(resolvedUserId),
  })
}

export function getMySubscriptions(params = {}) {
  return get(
    '/api/my/subscriptions',
    normalizePageParams({
      ...params,
      userId: Number(params.userId ?? getCurrentUserId()),
    }),
  )
}
