<script setup>
import { tabs } from './sharingConstants'
import { useSharingModulePage } from './useSharingModulePage'

const {
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
} = useSharingModulePage()
</script>

<template>
  <div class="page">
    <header class="hero card">
      <div class="hero-content">
        <div>
          <p class="eyebrow">farm-vue3 · 模块03</p>
          <h1>农产品共享领域联调页</h1>
          <p class="sub">
            这版前端把“收获确认 → 共享商品 → 上架 → 兑换下单 → 发货 → 完成 / 取消 → 共享币流水”这一条主链路直接串起来。
          </p>
        </div>
        <div class="user-box">
          <label>当前演示用户 ID</label>
          <input v-model="currentUserId" type="number" />
          <button class="primary" @click="handleCurrentUserChange">切换当前用户</button>
          <p class="hint">推荐演示：卖家 40001，买家 50001 或 60001</p>
        </div>
      </div>
    </header>

    <div v-if="notice.text" class="notice" :class="notice.type">
      {{ notice.text }}
    </div>

    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-show="activeTab === 'harvest'" class="grid-2">
      <article class="card">
        <h2>1. 模拟上游收获确认</h2>
        <p class="section-desc">对应内部接口：<code>POST /api/internal/sharing/harvest-batches/confirm</code></p>
        <div class="form-grid">
          <label>
            eventName
            <input v-model="harvestForm.eventName" />
          </label>
          <label>
            batchId
            <input v-model="harvestForm.batchId" type="number" />
          </label>
          <label>
            facilityId
            <input v-model="harvestForm.facilityId" type="number" />
          </label>
          <label>
            ownerUserId
            <input v-model="harvestForm.ownerUserId" type="number" />
          </label>
          <label>
            productName
            <input v-model="harvestForm.productName" />
          </label>
          <label>
            quantity
            <input v-model="harvestForm.quantity" type="number" />
          </label>
          <label>
            unit
            <input v-model="harvestForm.unit" />
          </label>
          <label>
            qualityLevel
            <input v-model="harvestForm.qualityLevel" />
          </label>
          <label>
            harvestedAt
            <input v-model="harvestForm.harvestedAt" type="datetime-local" />
          </label>
          <label>
            traceCode
            <input v-model="harvestForm.traceCode" />
          </label>
        </div>
        <button class="primary" @click="submitHarvest">写入共享商品池</button>
      </article>

      <article class="card">
        <h2>2. 共享商品池</h2>
        <p class="section-desc">当前 READY 商品数：{{ productTotal }}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>商品名</th>
                <th>ownerUserId</th>
                <th>质量</th>
                <th>traceCode</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in products" :key="product.id">
                <td>{{ product.id }}</td>
                <td>{{ product.productName }}</td>
                <td>{{ product.ownerUserId }}</td>
                <td>{{ product.qualityLevel }}</td>
                <td>{{ product.traceCode }}</td>
                <td class="action-cell">
                  <button @click="loadProductDetail(product.id)">查看</button>
                  <button class="primary" @click="applyProductToListing(product)">拿来上架</button>
                </td>
              </tr>
              <tr v-if="products.length === 0">
                <td colspan="6" class="empty">暂无 READY 状态共享商品</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article v-if="selectedProduct" class="card card-span-2">
        <h2>3. 商品详情 / 溯源快照</h2>
        <div class="detail-grid">
          <div class="detail-box">
            <p><strong>商品：</strong>{{ selectedProduct.productName }}</p>
            <p><strong>来源批次：</strong>{{ selectedProduct.sourceHarvestBatchId }}</p>
            <p><strong>来源设施：</strong>{{ selectedProduct.originFacilityId }}</p>
            <p><strong>数量：</strong>{{ selectedProduct.quantity }} {{ selectedProduct.unit }}</p>
            <p><strong>质量等级：</strong>{{ selectedProduct.qualityLevel }}</p>
            <p><strong>状态：</strong>{{ selectedProduct.status }}</p>
            <p><strong>创建时间：</strong>{{ formatDate(selectedProduct.createdAt) }}</p>
          </div>
          <pre class="json-box">{{ selectedProduct.traceSnapshotJson }}</pre>
        </div>
      </article>
    </section>

    <section v-show="activeTab === 'listings'" class="grid-2">
      <article class="card">
        <h2>4. 创建上架条目</h2>
        <p class="section-desc">对应接口：<code>POST /api/sharing/listings</code></p>
        <div class="form-grid">
          <label>
            shareProductId
            <input v-model="listingForm.shareProductId" type="number" placeholder="先在商品池点“拿来上架”" />
          </label>
          <label>
            title
            <input v-model="listingForm.title" />
          </label>
          <label>
            coinPrice
            <input v-model="listingForm.coinPrice" type="number" />
          </label>
          <label>
            stock
            <input v-model="listingForm.stock" type="number" />
          </label>
          <label class="full">
            expiredAt
            <input v-model="listingForm.expiredAt" type="datetime-local" />
          </label>
        </div>
        <button class="primary" @click="submitCreateListing">创建上架条目</button>
      </article>

      <article class="card">
        <h2>5. 共享上架广场</h2>
        <p class="section-desc">当前上架条目数：{{ listingTotal }}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>商品</th>
                <th>价格</th>
                <th>库存</th>
                <th>卖家</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="listing in listings" :key="listing.id">
                <tr>
                  <td>{{ listing.id }}</td>
                  <td>{{ listing.title }}</td>
                  <td>{{ listing.productName }}</td>
                  <td>{{ listing.coinPrice }}</td>
                  <td>{{ listing.stock }}</td>
                  <td>{{ listing.ownerUserId }}</td>
                  <td>{{ listing.status }}</td>
                  <td class="action-cell stack">
                    <div class="inline-btns">
                      <button @click="loadListingDetail(listing.id)">查看</button>
                      <template v-if="Number(currentUserId) !== listing.ownerUserId && listing.status === 'PUBLISHED'">
                        <input v-model="purchaseQuantities[listing.id]" type="number" min="1" class="qty-input" />
                        <button class="primary" @click="handleBuy(listing)">兑换</button>
                      </template>
                      <template v-else>
                        <button v-if="listing.status !== 'OFF_SHELF'" @click="startEditListing(listing)">编辑</button>
                        <button v-if="listing.status === 'PUBLISHED'" class="danger" @click="handleOffShelf(listing.id)">下架</button>
                      </template>
                    </div>
                  </td>
                </tr>
                <tr v-if="editListingId === listing.id" class="edit-row">
                  <td colspan="8">
                    <div class="edit-box">
                      <input v-model="editListingForm.title" placeholder="标题" />
                      <input v-model="editListingForm.coinPrice" type="number" placeholder="共享币价格" />
                      <input v-model="editListingForm.stock" type="number" placeholder="库存" />
                      <input v-model="editListingForm.expiredAt" type="datetime-local" />
                      <button class="primary" @click="submitUpdateListing(listing.id)">保存修改</button>
                      <button @click="cancelEditListing">取消</button>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="listings.length === 0">
                <td colspan="8" class="empty">暂无共享上架条目</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article v-if="selectedListing" class="card card-span-2">
        <h2>6. 上架条目详情</h2>
        <div class="detail-grid">
          <div class="detail-box">
            <p><strong>标题：</strong>{{ selectedListing.title }}</p>
            <p><strong>关联商品：</strong>{{ selectedListing.productName }}</p>
            <p><strong>卖家：</strong>{{ selectedListing.ownerUserId }}</p>
            <p><strong>价格：</strong>{{ selectedListing.coinPrice }}</p>
            <p><strong>库存：</strong>{{ selectedListing.stock }}</p>
            <p><strong>状态：</strong>{{ selectedListing.status }}</p>
            <p><strong>发布：</strong>{{ formatDate(selectedListing.publishedAt) }}</p>
            <p><strong>过期：</strong>{{ formatDate(selectedListing.expiredAt) }}</p>
            <p><strong>traceCode：</strong>{{ selectedListing.traceCode }}</p>
          </div>
          <div class="tip-box">
            <p>当前演示用户：<strong>{{ currentUserId }}</strong></p>
            <p>当用户不是卖家时，右侧表格会直接显示兑换按钮。</p>
            <p>当用户切成卖家时，右侧表格会显示编辑 / 下架按钮。</p>
          </div>
        </div>
      </article>
    </section>

    <section v-show="activeTab === 'account'" class="grid-2">
      <article class="card">
        <h2>7. 当前共享币账户</h2>
        <p class="section-desc">对应接口：<code>GET /api/sharing/coin-accounts/{userId}</code></p>
        <div v-if="account" class="account-box">
          <p><strong>userId：</strong>{{ account.userId }}</p>
          <p><strong>balance：</strong>{{ account.balance }}</p>
          <p><strong>status：</strong>{{ account.status }}</p>
          <p><strong>createdAt：</strong>{{ formatDate(account.createdAt) }}</p>
          <p><strong>updatedAt：</strong>{{ formatDate(account.updatedAt) }}</p>
        </div>
        <button class="primary" @click="loadAccount">刷新当前账户</button>
      </article>

      <article class="card">
        <h2>8. 共享币流水</h2>
        <p class="section-desc">当前用户 {{ currentUserId }} 的流水记录</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>变动</th>
                <th>金额</th>
                <th>余额后</th>
                <th>业务类型</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ledger in ledgers" :key="ledger.id">
                <td>{{ formatDate(ledger.createdAt) }}</td>
                <td>{{ ledger.changeType }}</td>
                <td>{{ ledger.changeAmount }}</td>
                <td>{{ ledger.balanceAfter }}</td>
                <td>{{ ledger.bizType }}</td>
                <td>{{ ledger.remark }}</td>
              </tr>
              <tr v-if="ledgers.length === 0">
                <td colspan="6" class="empty">当前用户暂无共享币流水</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section v-show="activeTab === 'orders'" class="grid-2">
      <article class="card">
        <h2>9. 订单筛选</h2>
        <p class="section-desc">对应接口：<code>GET /api/sharing/orders</code></p>
        <div class="form-grid">
          <label>
            role
            <select v-model="orderQuery.role">
              <option value="BUYER">BUYER</option>
              <option value="SELLER">SELLER</option>
            </select>
          </label>
          <label>
            userId
            <input v-model="orderQuery.userId" type="number" />
          </label>
          <label class="full">
            status
            <select v-model="orderQuery.status">
              <option value="">全部</option>
              <option value="PAID">PAID</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
        </div>
        <button class="primary" @click="loadOrders">刷新订单列表</button>
        <p class="hint">当前订单总数：{{ orderTotal }}</p>
      </article>

      <article class="card">
        <h2>10. 订单中心</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>订单号</th>
                <th>快照标题</th>
                <th>买家</th>
                <th>卖家</th>
                <th>数量</th>
                <th>币额</th>
                <th>状态</th>
                <th>物流</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td>{{ order.orderNo }}</td>
                <td>{{ order.listingTitleSnapshot }}</td>
                <td>{{ order.buyerUserId }}</td>
                <td>{{ order.sellerUserId }}</td>
                <td>{{ order.quantity }}</td>
                <td>{{ order.coinAmount }}</td>
                <td>{{ order.status }}</td>
                <td>{{ order.shippingStatus }}</td>
                <td class="action-cell stack">
                  <div class="inline-btns">
                    <button @click="loadOrderDetail(order.id)">查看</button>
                    <template v-if="orderQuery.role === 'SELLER' && order.status === 'PAID'">
                      <input v-model="shippingInputs[order.id]" placeholder="发货单号" />
                      <button class="primary" @click="handleShip(order)">发货</button>
                    </template>
                    <template v-if="orderQuery.role === 'BUYER' && order.status === 'SHIPPED'">
                      <button class="primary" @click="handleComplete(order)">完成</button>
                    </template>
                    <template v-if="orderQuery.role === 'BUYER' && order.status === 'PAID'">
                      <button class="danger" @click="handleCancel(order)">取消</button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="orders.length === 0">
                <td colspan="9" class="empty">暂无订单</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article v-if="selectedOrder" class="card card-span-2">
        <h2>11. 订单详情 / 快照</h2>
        <div class="detail-grid">
          <div class="detail-box">
            <p><strong>orderNo：</strong>{{ selectedOrder.orderNo }}</p>
            <p><strong>listingId：</strong>{{ selectedOrder.listingId }}</p>
            <p><strong>标题快照：</strong>{{ selectedOrder.listingTitleSnapshot }}</p>
            <p><strong>商品快照：</strong>{{ selectedOrder.productNameSnapshot }}</p>
            <p><strong>buyerUserId：</strong>{{ selectedOrder.buyerUserId }}</p>
            <p><strong>sellerUserId：</strong>{{ selectedOrder.sellerUserId }}</p>
            <p><strong>quantity：</strong>{{ selectedOrder.quantity }}</p>
            <p><strong>coinAmount：</strong>{{ selectedOrder.coinAmount }}</p>
            <p><strong>status：</strong>{{ selectedOrder.status }}</p>
            <p><strong>shippingStatus：</strong>{{ selectedOrder.shippingStatus }}</p>
            <p><strong>shippingNo：</strong>{{ selectedOrder.shippingNo || '-' }}</p>
            <p><strong>createdAt：</strong>{{ formatDate(selectedOrder.createdAt) }}</p>
            <p><strong>completedAt：</strong>{{ formatDate(selectedOrder.completedAt) }}</p>
          </div>
          <div class="tip-box">
            <p>这里特地显示了 <strong>listingTitleSnapshot</strong> 和 <strong>productNameSnapshot</strong>。</p>
            <p>这样即使后续卖家把上架标题改掉，历史订单仍然保留当时下单时的快照，不会跟着被改掉。</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.hero {
  margin-bottom: 18px;
}

.hero-content {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 20px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 10px;
  font-size: 32px;
}

h2 {
  margin: 0 0 12px;
  font-size: 22px;
}

.sub,
.section-desc,
.hint {
  color: #6b7280;
}

.user-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: #f8fafc;
}

.user-box input {
  width: 100%;
}

.tabs {
  display: flex;
  gap: 12px;
  margin: 18px 0;
  flex-wrap: wrap;
}

.tab-btn {
  border: none;
  background: #e5e7eb;
  color: #111827;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  font-weight: 600;
}

.tab-btn.active {
  background: #2563eb;
  color: #fff;
}

.notice {
  margin: 14px 0;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 600;
}

.notice.success {
  background: #ecfdf5;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.notice.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 18px;
}

.card-span-2 {
  grid-column: 1 / -1;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.form-grid .full {
  grid-column: 1 / -1;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
  color: #334155;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  outline: none;
}

button {
  border: none;
  background: #e5e7eb;
  color: #111827;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

button.primary {
  background: #2563eb;
  color: #fff;
}

button.danger {
  background: #dc2626;
  color: #fff;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 880px;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
  color: #475569;
  font-size: 14px;
}

.action-cell.stack .inline-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.qty-input {
  width: 72px;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 30px 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-box,
.tip-box,
.json-box {
  border-radius: 14px;
  background: #f8fafc;
  padding: 16px;
}

.json-box {
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
}

.edit-row td {
  background: #f8fafc;
}

.edit-box {
  display: grid;
  grid-template-columns: 1.6fr 0.8fr 0.8fr 1.2fr auto auto;
  gap: 10px;
  align-items: center;
}

.account-box p,
.detail-box p,
.tip-box p {
  margin: 0 0 10px;
}

@media (max-width: 1100px) {
  .hero-content,
  .grid-2,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .edit-box,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .card-span-2 {
    grid-column: auto;
  }
}
</style>
