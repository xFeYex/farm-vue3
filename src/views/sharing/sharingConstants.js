import { nowDateString, toInputDateTime } from './sharingDate'

export const tabs = [
  { key: 'harvest', label: '收获确认 / 商品池' },
  { key: 'listings', label: '上架与兑换' },
  { key: 'account', label: '共享币账户' },
  { key: 'orders', label: '订单中心' },
]

export const defaultCurrentUserId = 50001
export const defaultListingExpiredAt = '2026-12-31T23:59'

export function createHarvestForm() {
  const seed = Date.now()
  return {
    eventName: 'HarvestBatchConfirmed',
    batchId: seed,
    facilityId: 30001,
    ownerUserId: 40001,
    productName: '草莓',
    quantity: 88,
    unit: 'kg',
    qualityLevel: 'A',
    harvestedAt: toInputDateTime(nowDateString()),
    traceCode: `TRACE-${seed}`,
  }
}

export function createListingForm() {
  return {
    shareProductId: '',
    title: '',
    coinPrice: 10,
    stock: 10,
    expiredAt: defaultListingExpiredAt,
  }
}

export function createEditListingForm() {
  return {
    title: '',
    coinPrice: 0,
    stock: 0,
    expiredAt: '',
  }
}

export function createOrderQuery(userId = defaultCurrentUserId) {
  return {
    userId,
    role: 'BUYER',
    status: '',
  }
}
