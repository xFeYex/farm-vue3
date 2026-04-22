import request from '@/utils/request'

function unwrapResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('服务返回数据异常')
  }

  if (result.code !== 0) {
    const error = new Error(result.message || '请求失败')
    error.code = result.code
    error.result = result
    throw error
  }

  return result.data
}

async function legacyRequest(url, options = {}) {
  throw new Error('legacyRequest is deprecated')
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const result = await response.json()
  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '请求失败')
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

export const sharingApi = {
  listProducts(params) {
    return get('/api/sharing/products', params)
  },
  getProduct(id) {
    return get(`/api/sharing/products/${id}`)
  },
  createListing(payload) {
    return post('/api/sharing/listings', payload)
  },
  updateListing(id, payload) {
    return put(`/api/sharing/listings/${id}`, payload)
  },
  listListings(params) {
    return get('/api/sharing/listings', params)
  },
  getListing(id) {
    return get(`/api/sharing/listings/${id}`)
  },
  offShelfListing(id) {
    return post(`/api/sharing/listings/${id}/off-shelf`)
  },
  getCoinAccount(userId) {
    return get(`/api/sharing/coin-accounts/${userId}`)
  },
  listCoinLedgers(userId, params) {
    return get(`/api/sharing/coin-accounts/${userId}/ledgers`, params)
  },
  createOrder(payload) {
    return post('/api/sharing/orders', payload)
  },
  listOrders(params) {
    return get('/api/sharing/orders', params)
  },
  getOrder(id) {
    return get(`/api/sharing/orders/${id}`)
  },
  shipOrder(id, payload) {
    return post(`/api/sharing/orders/${id}/ship`, payload)
  },
  completeOrder(id) {
    return post(`/api/sharing/orders/${id}/complete`)
  },
  cancelOrder(id) {
    return post(`/api/sharing/orders/${id}/cancel`)
  },
  confirmHarvest(payload) {
    return post('/api/internal/sharing/harvest-batches/confirm', payload)
  },
}
