import { onMounted, reactive, ref } from 'vue'
import { sharingApi } from '../../api/sharing'
import {
  createEditListingForm,
  createHarvestForm,
  createListingForm,
  createOrderQuery,
  defaultCurrentUserId,
  defaultListingExpiredAt,
} from './sharingConstants'
import { formatDate, toBackendDateTime, toInputDateTime } from './sharingDate'

export function useSharingModulePage() {
  const activeTab = ref('harvest')
  const currentUserId = ref(defaultCurrentUserId)

  const notice = reactive({
    type: 'success',
    text: '',
  })

  const products = ref([])
  const productTotal = ref(0)
  const selectedProduct = ref(null)

  const listings = ref([])
  const listingTotal = ref(0)
  const selectedListing = ref(null)
  const editListingId = ref(null)

  const account = ref(null)
  const ledgers = ref([])

  const orders = ref([])
  const orderTotal = ref(0)
  const selectedOrder = ref(null)

  const purchaseQuantities = reactive({})
  const shippingInputs = reactive({})

  const harvestForm = reactive(createHarvestForm())
  const listingForm = reactive(createListingForm())
  const editListingForm = reactive(createEditListingForm())
  const orderQuery = reactive(createOrderQuery(defaultCurrentUserId))

  function showNotice(type, text) {
    notice.type = type
    notice.text = text
    window.clearTimeout(showNotice.timer)
    showNotice.timer = window.setTimeout(() => {
      notice.text = ''
    }, 2500)
  }

  function isPositiveNumber(value) {
    return Number.isFinite(value) && value > 0
  }

  function isNonNegativeNumber(value) {
    return Number.isFinite(value) && value >= 0
  }

  function isListingExpired(expiredAt) {
    if (!expiredAt) {
      return false
    }

    const expiredDate = new Date(String(expiredAt).replace(' ', 'T'))
    return !Number.isNaN(expiredDate.getTime()) && expiredDate.getTime() <= Date.now()
  }

  async function loadProducts() {
    const data = await sharingApi.listProducts({ page: 1, pageSize: 50, status: 'READY' })
    products.value = data.list || []
    productTotal.value = data.total || 0
    if (!selectedProduct.value && products.value.length > 0) {
      selectedProduct.value = products.value[0]
    }
  }

  async function loadProductDetail(id) {
    selectedProduct.value = await sharingApi.getProduct(id)
  }

  async function loadListings() {
    const data = await sharingApi.listListings({ page: 1, pageSize: 50 })
    listings.value = data.list || []
    listingTotal.value = data.total || 0
    if (!selectedListing.value && listings.value.length > 0) {
      selectedListing.value = listings.value[0]
    }
  }

  async function loadListingDetail(id) {
    selectedListing.value = await sharingApi.getListing(id)
  }

  async function loadAccount() {
    account.value = await sharingApi.getCoinAccount(Number(currentUserId.value))
    const data = await sharingApi.listCoinLedgers(Number(currentUserId.value), { page: 1, pageSize: 50 })
    ledgers.value = data.list || []
  }

  async function loadOrders() {
    const data = await sharingApi.listOrders({
      page: 1,
      pageSize: 50,
      userId: Number(orderQuery.userId),
      role: orderQuery.role,
      status: orderQuery.status,
    })
    orders.value = data.list || []
    orderTotal.value = data.total || 0
    if (!selectedOrder.value && orders.value.length > 0) {
      selectedOrder.value = orders.value[0]
    }
  }

  async function loadOrderDetail(id) {
    selectedOrder.value = await sharingApi.getOrder(id)
  }

  async function handleCurrentUserChange() {
    orderQuery.userId = Number(currentUserId.value)
    await Promise.all([loadAccount(), loadOrders()])
    showNotice('success', `当前演示用户已切换为 ${currentUserId.value}`)
  }

  async function submitHarvest() {
    const payload = {
      ...harvestForm,
      batchId: Number(harvestForm.batchId),
      facilityId: Number(harvestForm.facilityId),
      ownerUserId: Number(harvestForm.ownerUserId),
      quantity: Number(harvestForm.quantity),
      harvestedAt: toBackendDateTime(harvestForm.harvestedAt),
    }

    try {
      const data = await sharingApi.confirmHarvest(payload)
      selectedProduct.value = data
      Object.assign(harvestForm, createHarvestForm())
      await loadProducts()
      showNotice('success', '收获确认已写入共享商品池')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  function applyProductToListing(product) {
    listingForm.shareProductId = product.id
    listingForm.title = `${product.productName} 共享条目`
    listingForm.coinPrice = 10
    listingForm.stock = 10
    listingForm.expiredAt = defaultListingExpiredAt
    activeTab.value = 'listings'
    selectedProduct.value = product
  }

  async function submitCreateListing() {
    const shareProductId = Number(listingForm.shareProductId)
    const coinPrice = Number(listingForm.coinPrice)
    const stock = Number(listingForm.stock)
    const title = listingForm.title.trim()

    if (!isPositiveNumber(shareProductId)) {
      showNotice('error', '请选择可上架的 READY 商品')
      return
    }

    if (!title) {
      showNotice('error', '请输入上架标题')
      return
    }

    if (!isPositiveNumber(coinPrice)) {
      showNotice('error', '共享币价格必须大于 0')
      return
    }

    if (!isPositiveNumber(stock)) {
      showNotice('error', '库存必须大于 0')
      return
    }

    try {
      const payload = {
        shareProductId,
        title,
        coinPrice,
        stock,
        ...(listingForm.expiredAt ? { expiredAt: toBackendDateTime(listingForm.expiredAt) } : {}),
      }
      const data = await sharingApi.createListing(payload)
      selectedListing.value = data
      Object.assign(listingForm, createListingForm())
      await loadListings()
      showNotice('success', '共享上架条目创建成功')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  function startEditListing(listing) {
    if (listing.status === 'OFF_SHELF') {
      showNotice('error', 'OFF_SHELF 状态的上架单不能直接编辑')
      return
    }

    editListingId.value = listing.id
    editListingForm.title = listing.title
    editListingForm.coinPrice = listing.coinPrice
    editListingForm.stock = listing.stock
    editListingForm.expiredAt = toInputDateTime(listing.expiredAt)
  }

  function cancelEditListing() {
    editListingId.value = null
    Object.assign(editListingForm, createEditListingForm())
  }

  async function submitUpdateListing(id) {
    const title = editListingForm.title.trim()
    const coinPrice = Number(editListingForm.coinPrice)
    const stock = Number(editListingForm.stock)

    if (!title) {
      showNotice('error', '请输入上架标题')
      return
    }

    if (!isPositiveNumber(coinPrice)) {
      showNotice('error', '共享币价格必须大于 0')
      return
    }

    if (!isNonNegativeNumber(stock)) {
      showNotice('error', '库存不能为负数')
      return
    }

    try {
      const payload = {
        title,
        coinPrice,
        stock,
        ...(editListingForm.expiredAt ? { expiredAt: toBackendDateTime(editListingForm.expiredAt) } : {}),
      }
      const data = await sharingApi.updateListing(id, payload)
      selectedListing.value = data
      cancelEditListing()
      await loadListings()
      showNotice('success', '上架条目编辑成功')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleOffShelf(id) {
    const currentListing = listings.value.find((item) => item.id === id)

    if (currentListing && currentListing.status !== 'PUBLISHED') {
      showNotice('error', '只有 PUBLISHED 状态的上架单才能下架')
      return
    }

    try {
      const data = await sharingApi.offShelfListing(id)
      selectedListing.value = data
      await loadListings()
      showNotice('success', '共享条目已下架')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleBuy(listing) {
    const quantity = Number(purchaseQuantities[listing.id] || 1)

    if (!isPositiveNumber(quantity)) {
      showNotice('error', '兑换数量必须大于 0')
      return
    }

    if (Number(currentUserId.value) === Number(listing.ownerUserId)) {
      showNotice('error', '不能兑换自己发布的商品')
      return
    }

    if (listing.status !== 'PUBLISHED') {
      showNotice('error', '只有 PUBLISHED 状态的上架单才能兑换')
      return
    }

    if (isListingExpired(listing.expiredAt)) {
      showNotice('error', '该上架单已过期，无法继续兑换')
      return
    }

    if (quantity > Number(listing.stock)) {
      showNotice('error', '库存不足，请调整兑换数量')
      return
    }

    try {
      const data = await sharingApi.createOrder({
        listingId: listing.id,
        buyerUserId: Number(currentUserId.value),
        quantity,
      })
      selectedOrder.value = data
      purchaseQuantities[listing.id] = 1
      orderQuery.userId = Number(currentUserId.value)
      orderQuery.role = 'BUYER'
      await Promise.all([loadListings(), loadAccount(), loadOrders()])
      activeTab.value = 'orders'
      showNotice('success', '兑换下单成功，已自动扣减共享币')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleShip(order) {
    const shippingNo = String(shippingInputs[order.id] || '').trim()

    if (order.status !== 'PAID') {
      showNotice('error', '只有 PAID 状态的订单才能发货')
      return
    }

    if (!shippingNo) {
      showNotice('error', '发货时必须填写 shippingNo')
      return
    }

    try {
      await sharingApi.shipOrder(order.id, {
        shippingNo,
      })
      shippingInputs[order.id] = ''
      await loadOrders()
      await loadOrderDetail(order.id)
      showNotice('success', '订单已发货')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleComplete(order) {
    if (order.status !== 'SHIPPED') {
      showNotice('error', '只有 SHIPPED 状态的订单才能完成')
      return
    }

    try {
      await sharingApi.completeOrder(order.id)
      await loadOrders()
      await loadOrderDetail(order.id)
      showNotice('success', '订单已完成')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  async function handleCancel(order) {
    if (order.status !== 'PAID') {
      showNotice('error', '只有未发货的 PAID 订单才能取消')
      return
    }

    try {
      await sharingApi.cancelOrder(order.id)
      await Promise.all([loadOrders(), loadListings(), loadAccount()])
      await loadOrderDetail(order.id)
      showNotice('success', '订单已取消并退款')
    } catch (error) {
      showNotice('error', error.message)
    }
  }

  onMounted(async () => {
    try {
      await Promise.all([loadProducts(), loadListings(), loadAccount(), loadOrders()])
    } catch (error) {
      showNotice('error', error.message)
    }
  })

  return {
    activeTab,
    currentUserId,
    notice,
    products,
    productTotal,
    selectedProduct,
    listings,
    listingTotal,
    selectedListing,
    editListingId,
    account,
    ledgers,
    orders,
    orderTotal,
    selectedOrder,
    purchaseQuantities,
    shippingInputs,
    harvestForm,
    listingForm,
    editListingForm,
    orderQuery,
    formatDate,
    loadProductDetail,
    loadListingDetail,
    loadAccount,
    loadOrders,
    loadOrderDetail,
    handleCurrentUserChange,
    submitHarvest,
    applyProductToListing,
    submitCreateListing,
    startEditListing,
    cancelEditListing,
    submitUpdateListing,
    handleOffShelf,
    handleBuy,
    handleShip,
    handleComplete,
    handleCancel,
  }
}
