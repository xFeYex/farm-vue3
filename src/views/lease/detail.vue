<template>
  <div class="detail-container" v-loading="loading">
    <el-page-header @back="goBack" class="mb-20">
      <template #content>
        <span class="text-large font-600 mr-3">资源详情</span>
      </template>
    </el-page-header>

    <el-card v-if="resource" shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span class="title">{{ resource.title }}</span>
          <el-tag :type="resource.status === 'ON_SHELF' ? 'success' : 'info'">
            {{ resource.status === 'ON_SHELF' ? '上架中' : '已下架' }}
          </el-tag>
        </div>
      </template>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="类型">
          {{ getTypeLabel(resource.resourceType) }}
        </el-descriptions-item>
        <el-descriptions-item label="面积">
          {{ resource.area }} ㎡
        </el-descriptions-item>
        <el-descriptions-item label="月租金">
          <span class="price-text">¥{{ resource.pricePerMonth }}/月</span>
        </el-descriptions-item>
        <el-descriptions-item label="最短租期">
          {{ resource.minLeaseMonths }} 个月
        </el-descriptions-item>
        <el-descriptions-item label="位置" :span="2">
          {{ resource.locationDesc }}
        </el-descriptions-item>
        <el-descriptions-item label="资源说明" :span="2">
          <div class="description-text">{{ resource.description || '暂无说明' }}</div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 订阅状态与操作区 -->
      <div class="action-section">
        <div class="status-info">
          当前我的订阅状态：
          <span :class="subscriptionStatusClass">
            {{ getSubscriptionStatusLabel(currentSubscription?.status) }}
          </span>
          <span v-if="currentSubscription" class="date-info">
            （{{ currentSubscription.startDate }} ~ {{ currentSubscription.endDate }}）
          </span>
        </div>

        <div class="buttons-group">
          <!-- 未订阅且资源上架中，可以订阅 -->
          <el-button 
            v-if="!currentSubscription && resource.status === 'ON_SHELF'" 
            type="primary" 
            size="large"
            @click="handleSubscribe"
          >
            订阅资源
          </el-button>
          
          <!-- 已订阅且生效中，可以续订和退订 -->
          <template v-if="currentSubscription && currentSubscription.status === 'ACTIVE'">
            <el-button type="success" size="large" @click="handleRenew">续订资源</el-button>
            <el-button type="danger" size="large" @click="handleCancel" :loading="canceling">退订资源</el-button>
          </template>

          <el-button 
            v-if="!currentSubscription && resource.status === 'OFF_SHELF'" 
            type="info" 
            disabled 
            size="large"
          >
            已下架不可订阅
          </el-button>
        </div>
      </div>
    </el-card>

    <el-empty v-else-if="!loading" description="未找到资源信息" />

    <!-- 弹窗组件 -->
    <SubscribeDialog 
      ref="subscribeDialogRef" 
      :resource-id="resourceId" 
      :min-lease-months="resource?.minLeaseMonths || 1"
      @success="fetchData" 
    />
    
    <RenewDialog 
      ref="renewDialogRef" 
      :subscription-id="currentSubscription?.id || ''"
      :current-end-date="currentSubscription?.endDate || ''"
      @success="fetchData" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getResourceDetail, cancelSubscription, getMySubscriptions } from '@/api/lease'
import { ElMessage, ElMessageBox } from 'element-plus'

import SubscribeDialog from './components/SubscribeDialog.vue'
import RenewDialog from './components/RenewDialog.vue'

const route = useRoute()
const router = useRouter()

const resourceId = computed(() => route.params.id)

const loading = ref(false)
const canceling = ref(false)
const resource = ref(null)
const currentSubscription = ref(null)

const subscribeDialogRef = ref(null)
const renewDialogRef = ref(null)

// 获取页面数据
const fetchData = async () => {
  if (!resourceId.value) return
  loading.value = true
  try {
    // 1. 获取资源详情
    const res = await getResourceDetail(resourceId.value)
    resource.value = res.data || res

    // 2. 模拟获取当前用户的订阅状态（通过查询我的订阅列表过滤）
    // 实际项目中后端可能会在详情接口直接返回 currentUserSubscription，MVP中我们使用列表查找模拟
    const subRes = await getMySubscriptions({ page: 1, pageSize: 100 })
    const subList = subRes.data?.list || subRes.list || []
    
    // 寻找当前资源的最新订阅记录（假设只有一条或者取状态最活跃的一条）
    const matchedSub = subList.find(sub => sub.resourceId == resourceId.value)
    currentSubscription.value = matchedSub || null

  } catch (error) {
    console.error('获取资源详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

// 类型转换
const getTypeLabel = (type) => {
  const typeMap = {
    'GREENHOUSE': '大棚',
    'FARMLAND': '菜地',
    'ORCHARD': '果园'
  }
  return typeMap[type] || type
}

// 订阅状态转换
const getSubscriptionStatusLabel = (status) => {
  if (!status) return '未订阅'
  const statusMap = {
    'ACTIVE': '生效中',
    'EXPIRED': '已到期',
    'CANCELLED': '已退订'
  }
  return statusMap[status] || status
}

const subscriptionStatusClass = computed(() => {
  const status = currentSubscription.value?.status
  if (!status) return 'status-none'
  if (status === 'ACTIVE') return 'status-active'
  if (status === 'EXPIRED') return 'status-expired'
  return 'status-cancelled'
})

// 操作事件
const goBack = () => {
  router.back()
}

const handleSubscribe = () => {
  subscribeDialogRef.value?.open()
}

const handleRenew = () => {
  renewDialogRef.value?.open()
}

const handleCancel = () => {
  if (!currentSubscription.value?.id) return
  
  ElMessageBox.confirm(
    '确定要退订该资源吗？退订后不可恢复。',
    '退订确认',
    {
      confirmButtonText: '确定退订',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    canceling.value = true
    try {
      await cancelSubscription(currentSubscription.value.id)
      ElMessage.success('退订成功')
      fetchData() // 刷新状态
    } catch (error) {
      console.error('退订失败:', error)
      ElMessage.error('退订失败，请重试')
    } finally {
      canceling.value = false
    }
  }).catch(() => {
    // 取消
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.detail-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.mb-20 {
  margin-bottom: 20px;
}

.mr-3 {
  margin-right: 12px;
}

.font-600 {
  font-weight: 600;
}

.text-large {
  font-size: 18px;
}

.info-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.price-text {
  color: #f56c6c;
  font-size: 16px;
  font-weight: bold;
}

.description-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #606266;
}

.action-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.status-info {
  font-size: 16px;
  color: #606266;
}

.status-none {
  color: #909399;
  font-weight: bold;
}

.status-active {
  color: #67c23a;
  font-weight: bold;
}

.status-expired {
  color: #e6a23c;
  font-weight: bold;
}

.status-cancelled {
  color: #f56c6c;
  font-weight: bold;
}

.date-info {
  font-size: 14px;
  color: #909399;
  margin-left: 8px;
}

.buttons-group {
  display: flex;
  gap: 15px;
}
</style>
