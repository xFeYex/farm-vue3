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

function get(url, params) {
  return request
    .get(url, withManualUser({ params: cleanObject(params) }))
    .then(unwrapResult)
    .catch(rethrowRequestError)
}

export function getDashboard(resourceId, userId) {
  return get(`/api/production/dashboard/${resourceId}`, { userId })
}

export function getEnvironment(resourceId, userId) {
  return get(`/api/production/environment/${resourceId}`, { userId })
}

export function getPlanList(resourceId, params = {}) {
  return get(
    `/api/production/plan/${resourceId}`,
    normalizePageParams(params),
  )
}

export function getHarvestList(resourceId, params = {}) {
  return get(
    `/api/production/harvest/${resourceId}`,
    normalizePageParams(params),
  )
}

export function updateOrchestration(resourceId, data) {
  return request
    .put(`/api/production/orchestration/${resourceId}`, cleanObject(data), withManualUser())
    .then(unwrapResult)
    .catch(rethrowRequestError)
}

export function createPlan(resourceId, data) {
  return request
    .post(`/api/production/plan/${resourceId}`, cleanObject(data), withManualUser())
    .then(unwrapResult)
    .catch(rethrowRequestError)
}

export function createHarvest(resourceId, data) {
  return request
    .post(`/api/production/harvest/${resourceId}`, cleanObject(data), withManualUser())
    .then(unwrapResult)
    .catch(rethrowRequestError)
}
