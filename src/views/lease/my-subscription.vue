<template>
  <div class="my-subscription-container">
    <div class="header">
      <h2>我的订阅</h2>
    </div>

    <!-- 订阅列表 -->
    <div class="list-wrapper" v-loading="loading">
      <el-card v-for="item in list" :key="item.id" class="list-item" shadow="hover">
        <div class="item-content">
          <div class="item-main">
            <div class="item-header">
              <!-- 这里假设后端在列表中返回了关联的资源名称，如果是纯外键，需要后端做 VO 拼装 -->
              <span class="title">{{ item.resourceName || `资源ID: ${item.resourceId}` }}</span>
              <el-tag :type="getStatusType(item.status)" size="small">
                {{ getStatusLabel(item.status) }}
              </el-tag>
            </div>
            <div class="item-details">
              <span class="detail-item">
                <el-icon><Calendar /></el-icon> 租期：{{ item.startDate }} ~ {{ item.endDate }}
              </span>
            </div>
          </div>
          
          <div class="item-actions">
            <el-button link type="primary" @click="goToDetail(item.resourceId)">查看资源</el-button>
            <template v-if="item.status === 'ACTIVE'">
              <el-button link type="success" @click="handleRenew(item)">续订</el-button>
              <el-button link type="danger" @click="handleCancel(item)">退订</el-button>
            </template>
          </div>
        </div>
      </el-card>

      <el-empty v-if="!loading && list.length === 0" description="暂无订阅记录" />
    </div>

    <!-- 分页 -->
    <div class="pagination-container" v-if="total > 0">
      <el-pagination
        v-model:current-page="queryForm.page"
        v-model:page-size="queryForm.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 续订弹窗 -->
    <RenewDialog 
      ref="renewDialogRef"
      :subscription-id="currentActionItem?.id || ''"
      :current-end-date="currentActionItem?.endDate || ''"
      @success="fetchData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar } from '@element-plus/icons-vue'
import { getMySubscriptions, cancelSubscription } from '@/api/lease'
import { ElMessage, ElMessageBox } from 'element-plus'
import RenewDialog from './components/RenewDialog.vue'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref([])

const renewDialogRef = ref(null)
const currentActionItem = ref(null)

const queryForm = reactive({
  page: 1,
  pageSize: 10
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getMySubscriptions(queryForm)
    const data = res.data || res
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    console.error('获取我的订阅列表失败:', error)
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

// 状态展示
const getStatusLabel = (status) => {
  const statusMap = {
    'ACTIVE': '生效中',
    'EXPIRED': '已到期',
    'CANCELLED': '已退订'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  if (status === 'ACTIVE') return 'success'
  if (status === 'EXPIRED') return 'warning'
  return 'info' // CANCELLED
}

// 分页处理
const handleSizeChange = (val) => {
  queryForm.pageSize = val
  fetchData()
}

const handleCurrentChange = (val) => {
  queryForm.page = val
  fetchData()
}

// 操作跳转与弹窗
const goToDetail = (resourceId) => {
  router.push(`/lease/resource/${resourceId}`)
}

const handleRenew = (item) => {
  currentActionItem.value = item
  renewDialogRef.value?.open()
}

const handleCancel = (item) => {
  ElMessageBox.confirm(
    '确定要退订该资源吗？退订后将立即失效。',
    '退订确认',
    {
      confirmButtonText: '确定退订',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await cancelSubscription(item.id)
      ElMessage.success('退订成功')
      fetchData()
    } catch (error) {
      console.error('退订失败:', error)
      ElMessage.error('退订失败')
    }
  }).catch(() => {
    // 取消操作
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.my-subscription-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
}

.list-wrapper {
  min-height: 200px;
}

.list-item {
  margin-bottom: 15px;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-main {
  flex: 1;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.item-details {
  color: #606266;
  font-size: 14px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.item-actions {
  margin-left: 20px;
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
